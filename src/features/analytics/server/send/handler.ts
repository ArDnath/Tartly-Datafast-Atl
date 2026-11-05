import { isbot } from 'isbot';
import { serializeError } from 'serialize-error';
import { z } from 'zod';
import { getFilteredAttributionQuery } from '@/features/analytics/lib/attribution-query';
import {
  type CollectorCachePayload,
  createCollectorCacheToken,
  parseCollectorCacheToken,
} from '@/features/analytics/lib/collector-cache';
import { COLLECTION_TYPE, EVENT_TYPE } from '@/lib/constants';
import {
  CROSS_DOMAIN_LINKER_TTL_MS,
  createCrossDomainLinker,
  parseCrossDomainLinker,
} from '@/features/analytics/lib/cross-domain-linker';
import { getSalt, secret, uuid } from '@/lib/crypto';
import { getClientInfo, hasBlockedIp } from '@/features/analytics/lib/detect';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { fetchWebsite } from '@/lib/load';
import { getPaymentReturnDetection } from '@/features/payments/lib/payment-detection';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serverError } from '@/lib/response';
import { anyObjectParam, urlOrPathParam } from '@/lib/schema';
import {
  getTrackingSessionId,
  getTrackingVisitorId,
} from '@/features/analytics/lib/tracking-identity';
import { safeDecodeURI, safeDecodeURIComponent } from '@/lib/url';
import { isBillableEvent, releaseEventUsage, reserveEventUsage } from '@/lib/usage';
import { isTrackerOriginAllowed } from '@/features/analytics/lib/tracker-origin';
import {
  ensureVisitorContext,
  savePaymentDetectionEvent,
  upsertCustomerIdentityLink,
  upsertVisitorContext,
} from '@/features/payments/server/queries/attribution';
import { getWebsiteAttributionRuntimeConfig } from '@/queries/prisma/website';
import {
  createSession,
  saveEvent,
  saveSessionData,
  updateSessionDistinctId,
} from '@/features/analytics/server/queries/sql';

const schema = z.object({
  type: z.enum(['event', 'identify', 'performance', 'linker']),
  payload: z
    .object({
      website: z.uuid().optional(),
      link: z.uuid().optional(),
      pixel: z.uuid().optional(),
      data: anyObjectParam.optional(),
      hostname: z.string().max(100).optional(),
      language: z.string().max(35).optional(),
      referrer: urlOrPathParam.optional(),
      screen: z.string().max(11).optional(),
      title: z.string().optional(),
      url: urlOrPathParam.optional(),
      name: z.string().max(50).optional(),
      tag: z.string().max(50).optional(),
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      timestamp: z.coerce.number().int().optional(),
      id: z.string().optional(),
      visitorId: z.string().max(100).optional(),
      sessionId: z.string().max(100).optional(),
      linker: z.string().max(4096).optional(),
      browser: z.string().optional(),
      os: z.string().optional(),
      device: z.string().optional(),
      lcp: z.number().nonnegative().max(60000).optional(),
      inp: z.number().nonnegative().max(60000).optional(),
      cls: z.number().nonnegative().max(100).optional(),
      fcp: z.number().nonnegative().max(60000).optional(),
      ttfb: z.number().nonnegative().max(60000).optional(),
    })
    .refine(
      data => {
        const keys = [data.website, data.link, data.pixel];
        const count = keys.filter(Boolean).length;
        return count === 1;
      },
      {
        message: 'Exactly one of website, link, or pixel must be provided',
        path: ['website'],
      },
    ),
});

export async function POST(request: Request) {
  let reservedWorkspaceId: string | null = null;
  let eventCommitted = false;

  try {
    const { body, error } = await parseRequest(request, schema, { skipAuth: true });

    if (error) {
      return error();
    }

    const { type, payload } = body;

    const {
      website: websiteId,
      pixel: pixelId,
      link: linkId,
      hostname,
      screen,
      language,
      url,
      referrer,
      name,
      data,
      title,
      tag,
      timestamp,
      id,
      visitorId: payloadVisitorToken,
      sessionId: payloadSessionToken,
      linker,
      lcp,
      inp,
      cls,
      fcp,
      ttfb,
    } = payload;

    const sourceId = websiteId || pixelId || linkId;

    // Cache check
    let cache: CollectorCachePayload | null = null;
    let workspaceId: string | null = null;
    let websiteDomain: string | null = null;

    if (websiteId) {
      const cacheHeader = request.headers.get('x-talivia-cache');

      if (cacheHeader) {
        cache = parseCollectorCacheToken(cacheHeader, websiteId, secret());
      }

      workspaceId = cache?.workspaceId ?? null;

      // The tenant is required for usage metering. Older cache tokens do not
      // contain it, so resolve the website once and refresh the token below.
      // Origin enforcement also needs the configured domain on every request.
      if (!cache?.websiteId || !workspaceId || process.env.ENFORCE_TRACKER_ORIGIN === 'true') {
        const website = await fetchWebsite(websiteId);

        if (!website) {
          return badRequest({ message: 'Website not found.' });
        }

        workspaceId = website.workspaceId ?? null;
        websiteDomain = website.domain ?? null;
      }
    }

    // Client info
    const { ip, userAgent, device, browser, os, country, region, city } = await getClientInfo(
      request,
      payload,
    );

    // Optional domain binding: when the owner configured a domain and
    // ENFORCE_TRACKER_ORIGIN is on, a public website ID copied to another host
    // cannot inject events. No host on the payload is allowed for server-side
    // and older clients; see the tracker-origin unit tests.
    if (websiteId && websiteDomain) {
      const allowedOrigin = isTrackerOriginAllowed({
        configuredDomain: websiteDomain,
        hostname,
        origin: request.headers.get('origin'),
      });

      if (!allowedOrigin) {
        return forbidden({
          code: 'tracker-origin-mismatch',
          message: 'This website does not accept events from that host.',
        });
      }
    }

    // Bot check
    if (!process.env.DISABLE_BOT_CHECK && isbot(userAgent)) {
      return json({ beep: 'boop' });
    }

    // IP block
    if (hasBlockedIp(ip)) {
      return forbidden();
    }

    const createdAt = timestamp ? new Date(timestamp * 1000) : new Date();
    let visitorToken = payloadVisitorToken;
    let sessionToken = payloadSessionToken;

    if (websiteId && linker) {
      const linked = parseCrossDomainLinker(linker, websiteId, secret());

      if (linked) {
        visitorToken = linked.visitorToken;
        sessionToken = linked.sessionToken;
        cache = null;
      }
    }

    let visitorId: string | null = null;
    let sessionId: string;

    if (websiteId) {
      if (cache) {
        visitorId = cache.visitorId;
        sessionId = cache.sessionId;
      } else {
        if (!visitorToken || !sessionToken) {
          return badRequest({ message: 'Missing visitor or session identity.' });
        }

        visitorId = getTrackingVisitorId(websiteId, visitorToken);
        sessionId = getTrackingSessionId(websiteId, sessionToken);
      }
    } else {
      sessionId = id
        ? uuid(sourceId, 'identified', id)
        : uuid(
            sourceId,
            'server',
            ip,
            userAgent,
            getSalt(process.env.SALT_ROTATION || 'month', createdAt),
          );
    }

    const isNewContext = !cache;

    if (websiteId && visitorId && visitorToken && isNewContext) {
      await ensureVisitorContext({
        websiteId,
        visitorId,
        visitorToken,
        occurredAt: createdAt,
      });
    }

    // Create a session if not found
    if (isNewContext) {
      await createSession({
        id: sessionId,
        websiteId: sourceId,
        visitorId,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,
        distinctId: id,
        createdAt,
      });
    }

    let visitor =
      websiteId && visitorId && visitorToken && type !== COLLECTION_TYPE.event
        ? await upsertVisitorContext({
            websiteId,
            visitorId,
            visitorToken,
            sessionId,
            occurredAt: createdAt,
          })
        : visitorId
          ? { id: visitorId }
          : null;

    if (type === COLLECTION_TYPE.event) {
      const base = hostname ? `https://${hostname}` : 'https://localhost';
      const currentUrl = new URL(url, base);
      const attributionConfig = websiteId
        ? await getWebsiteAttributionRuntimeConfig(websiteId)
        : null;
      const ignoredQueryParams = attributionConfig?.ignoredQueryParams || [];
      const ownedDomains = attributionConfig?.ownedDomains || [];

      let urlPath =
        currentUrl.pathname === '/undefined' ? '' : currentUrl.pathname + currentUrl.hash;
      const urlQuery = getFilteredAttributionQuery(currentUrl, ignoredQueryParams);
      const urlDomain = currentUrl.hostname.replace(/^www\./, '').toLowerCase();

      let referrerPath = '';
      let referrerQuery = '';
      let referrerDomain = '';

      // UTM Params
      const utmSource = currentUrl.searchParams.get('utm_source');
      const utmMedium = currentUrl.searchParams.get('utm_medium');
      const utmCampaign = currentUrl.searchParams.get('utm_campaign');
      const utmContent = currentUrl.searchParams.get('utm_content');
      const utmTerm = currentUrl.searchParams.get('utm_term');

      // Click IDs
      const gclid = currentUrl.searchParams.get('gclid');
      const gclsrc = currentUrl.searchParams.get('gclsrc');
      const wbraid = currentUrl.searchParams.get('wbraid');
      const gbraid = currentUrl.searchParams.get('gbraid');
      const fbclid = currentUrl.searchParams.get('fbclid');
      const msclkid = currentUrl.searchParams.get('msclkid');
      const ttclid = currentUrl.searchParams.get('ttclid');
      const lifatid = currentUrl.searchParams.get('li_fat_id');
      const twclid = currentUrl.searchParams.get('twclid');

      if (process.env.REMOVE_TRAILING_SLASH) {
        urlPath = urlPath.replace(/\/(?=(#.*)?$)/, '');
      }

      if (referrer) {
        const referrerUrl = new URL(referrer, base);

        referrerPath = referrerUrl.pathname;
        referrerQuery = getFilteredAttributionQuery(referrerUrl, ignoredQueryParams);
        referrerDomain = referrerUrl.hostname.replace(/^www\./, '').toLowerCase();
      }

      const ownedReferrer = isOwnedHostname(referrerDomain, [urlDomain, ...ownedDomains]);

      const eventType = linkId
        ? EVENT_TYPE.linkEvent
        : pixelId
          ? EVENT_TYPE.pixelEvent
          : name
            ? EVENT_TYPE.customEvent
            : EVENT_TYPE.pageView;

      // Reserve the billable event before writing it. Bot, blocked-IP, and
      // invalid requests returned earlier, so they never consume allowance.
      if (websiteId && workspaceId && isBillableEvent(eventType)) {
        const entitlements = await getWorkspaceEntitlements(workspaceId);
        const reservation = await reserveEventUsage(
          workspaceId,
          entitlements?.plan?.eventsPerMonth ?? 0,
        );

        if (!reservation.allowed) {
          return json({
            ok: false,
            reason: 'usage_limit_reached',
            limit: reservation.limit,
            used: reservation.used,
          });
        }

        reservedWorkspaceId = workspaceId;
      }

      if (websiteId && visitorId && visitorToken) {
        visitor = await upsertVisitorContext({
          websiteId,
          visitorId,
          visitorToken,
          sessionId,
          occurredAt: createdAt,
          source: utmSource || (!referrerDomain || ownedReferrer ? 'direct' : undefined),
          medium: utmMedium,
          campaign: utmCampaign,
          referrerDomain: ownedReferrer ? undefined : referrerDomain,
          referrerPath: ownedReferrer ? undefined : safeDecodeURI(referrerPath),
          referrerQuery: ownedReferrer ? undefined : referrerQuery,
          landingPath: safeDecodeURI(urlPath) || '/',
          country,
          device,
          captureFirstTouch: eventType === EVENT_TYPE.pageView,
        });
      }

      const websiteEventId = await saveEvent({
        websiteId: sourceId,
        visitorId,
        sessionId,
        eventType,
        createdAt,

        // Page
        pageTitle: safeDecodeURIComponent(title),
        hostname: hostname || urlDomain,
        urlPath: safeDecodeURI(urlPath),
        urlQuery,
        referrerPath: safeDecodeURI(referrerPath),
        referrerQuery,
        referrerDomain,

        // Session
        distinctId: id,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,

        // Events
        eventName: name,
        eventData: data,
        tag,

        // UTM
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,

        // Click IDs
        gclid,
        gclsrc,
        wbraid,
        gbraid,
        fbclid,
        msclkid,
        ttclid,
        lifatid,
        twclid,
      });

      eventCommitted = true;

      const paymentDetection =
        attributionConfig?.enablePaymentUrlDetection === false
          ? null
          : getPaymentReturnDetection(currentUrl);

      if (websiteId && visitor && websiteEventId && paymentDetection) {
        await savePaymentDetectionEvent({
          websiteId,
          visitorId: visitor.id,
          sessionId,
          websiteEventId,
          providerName: paymentDetection.providerName,
          providerCheckoutId: paymentDetection.providerReferenceId,
          urlPath: safeDecodeURI(urlPath),
          urlQuery,
          occurredAt: createdAt,
        });
      }
    } else if (type === COLLECTION_TYPE.identify) {
      if (websiteId && visitor) {
        const identity = getIdentityPayload(data, id);

        if (identity) {
          await upsertCustomerIdentityLink({
            websiteId,
            visitorId: visitor.id,
            sessionId,
            occurredAt: createdAt,
            ...identity,
          });
        }
      }

      if (websiteId && id) {
        await updateSessionDistinctId(websiteId, sessionId, id);
      }

      if (data) {
        await saveSessionData({
          websiteId,
          sessionId,
          sessionData: data,
          distinctId: id,
          createdAt,
        });
      }
    } else if (type === COLLECTION_TYPE.performance) {
      const base = hostname ? `https://${hostname}` : 'https://localhost';
      const currentUrl = new URL(url, base);
      const urlPath = currentUrl.pathname === '/undefined' ? '' : currentUrl.pathname;

      await saveEvent({
        websiteId: sourceId,
        visitorId,
        sessionId,
        urlPath,
        pageTitle: safeDecodeURIComponent(title),
        eventType: EVENT_TYPE.performance,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,
        lcp,
        inp,
        cls,
        fcp,
        ttfb,
        createdAt,
      });
    }

    const token =
      websiteId && visitorId
        ? createCollectorCacheToken(
            {
              websiteId,
              visitorId,
              sessionId,
              ...(workspaceId ? { workspaceId } : {}),
            },
            secret(),
          )
        : undefined;
    const crossDomainLinker =
      websiteId && visitorToken && sessionToken
        ? createCrossDomainLinker(websiteId, { visitorToken, sessionToken }, secret())
        : undefined;

    return json({
      cache: token,
      linker: crossDomainLinker,
      linkerExpiresAt: crossDomainLinker ? Date.now() + CROSS_DOMAIN_LINKER_TTL_MS : undefined,
      visitorId: visitorToken,
      sessionId: sessionToken,
    });
  } catch (e) {
    if (reservedWorkspaceId && !eventCommitted) {
      // A failed write must not consume allowance. This is best-effort: the
      // original error is still the one returned to the client.
      try {
        await releaseEventUsage(reservedWorkspaceId);
      } catch {
        // Ignore release failures; the counter is repaired by the next write
        // or the period rollover.
      }
    }

    const error = serializeError(e);

    // eslint-disable-next-line no-console
    console.log(error);

    return serverError({ errorObject: error });
  }
}

function isOwnedHostname(
  hostname: string | undefined,
  ownedDomains: (string | null | undefined)[],
) {
  if (!hostname) {
    return false;
  }

  const normalized = hostname.replace(/^www\./, '').toLowerCase();

  return ownedDomains.filter(Boolean).some(domain => {
    const owned = String(domain)
      .replace(/^www\./, '')
      .toLowerCase();

    return normalized === owned || normalized.endsWith(`.${owned}`);
  });
}

function getDataString(data: Record<string, any>, names: string[]) {
  for (const name of names) {
    const value = data[name];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
}

function getIdentityPayload(data: Record<string, any> = {}, distinctId?: string) {
  const stripeCustomerId = getDataString(data, ['stripeCustomerId', 'stripe_customer_id']);
  const lemonCustomerId = getDataString(data, [
    'lemonsqueezyCustomerId',
    'lemonsqueezy_customer_id',
    'lemonSqueezyCustomerId',
    'lemon_squeezy_customer_id',
  ]);
  const polarCustomerId = getDataString(data, ['polarCustomerId', 'polar_customer_id']);
  const providerCustomerId =
    getDataString(data, ['providerCustomerId', 'provider_customer_id']) ||
    stripeCustomerId ||
    lemonCustomerId ||
    polarCustomerId;
  const providerName =
    getDataString(data, ['providerName', 'provider_name', 'paymentProvider', 'payment_provider']) ||
    (stripeCustomerId
      ? 'stripe'
      : lemonCustomerId
        ? 'lemonsqueezy'
        : polarCustomerId
          ? 'polar'
          : undefined);
  const externalCustomerId =
    getDataString(data, [
      'externalCustomerId',
      'external_customer_id',
      'customerId',
      'customer_id',
      'userId',
      'user_id',
    ]) || distinctId;
  const email = getDataString(data, ['email', 'customerEmail', 'customer_email']);
  const emailHash = getDataString(data, ['emailHash', 'email_hash']);
  const name = getDataString(data, ['name', 'displayName', 'display_name']);
  const avatarUrl = getDataString(data, ['avatarUrl', 'avatar_url', 'imageUrl', 'image_url']);

  if (!externalCustomerId && !providerCustomerId && !email && !emailHash) {
    return null;
  }

  return {
    externalCustomerId,
    providerName,
    providerCustomerId,
    email,
    emailHash,
    name,
    avatarUrl,
  };
}
