import { isbot } from 'isbot';
import { z } from 'zod';
import { getFilteredAttributionQuery } from '@/features/analytics/lib/attribution-query';
import { getClientEventId } from '@/features/analytics/lib/event-id';
import {
  type CollectorCachePayload,
  createCollectorCacheToken,
  parseCollectorCacheToken,
} from '@/features/analytics/lib/collector-cache';
import {
  CROSS_DOMAIN_LINKER_TTL_MS,
  createCrossDomainLinker,
  parseCrossDomainLinker,
} from '@/features/analytics/lib/cross-domain-linker';
import { getClientInfo, hasBlockedIp } from '@/features/analytics/lib/detect';
import { isTrackerOriginAllowed } from '@/features/analytics/lib/tracker-origin';
import {
  getTrackingSessionId,
  getTrackingVisitorId,
  TRACKING_TOKEN_MAX_LENGTH,
} from '@/features/analytics/lib/tracking-identity';
import {
  createSession,
  saveEvent,
  saveSessionData,
  updateSessionDistinctId,
} from '@/features/analytics/server/queries/sql';
import { getPaymentReturnDetection } from '@/features/payments/lib/payment-detection';
import {
  ensureVisitorContext,
  savePaymentDetectionEvent,
  upsertCustomerIdentityLink,
  upsertVisitorContext,
} from '@/features/payments/server/queries/attribution';
import { COLLECTION_TYPE, EVENT_TYPE } from '@/lib/constants';
import { getSalt, hash, secret, uuid } from '@/lib/crypto';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { fetchWebsite } from '@/lib/load';
import { logger } from '@/lib/logger';
import { isUniqueConstraintError } from '@/lib/prisma-error';
import { hashRateLimitSubject, rateLimitKey } from '@/lib/rate-limit';
import redis from '@/lib/redis';
import { parseRequest } from '@/lib/request';
import { badRequest, forbidden, json, serverError, tooManyRequests } from '@/lib/response';
import { anyObjectParam, urlOrPathParam } from '@/lib/schema';
import { safeDecodeURI, safeDecodeURIComponent } from '@/lib/url';
import { EVENT_GRACE, isBillableEvent, releaseEventUsage, reserveEventUsage } from '@/lib/usage';
import { getLink, getPixel } from '@/queries/prisma';
import { getWebsiteAttributionRuntimeConfig } from '@/queries/prisma/website';

const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENT_FUTURE_MS = 5 * 60 * 1000;

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
      timestamp: z.coerce.number().int().min(946684800).max(4102444800).optional(),
      id: z.string().optional(),
      // Client-generated, per-event idempotency key. Retrying the same event
      // must not create a second row or consume a second usage slot. Accept
      // short legacy values rather than rejecting the whole collector request.
      eventId: z.string().max(100).optional(),
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
      eventId: payloadEventId,
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
      // Always resolve the website, even when a cache token carries the
      // tenant: a valid token must stop working the moment the website is
      // deleted or its workspace changes.
      const website = await fetchWebsite(websiteId);

      if (!website) {
        return badRequest({ message: 'Website not found.' });
      }

      workspaceId = website.workspaceId ?? null;
      websiteDomain = website.domain ?? null;

      const cacheHeader = request.headers.get('x-talivia-cache');

      if (cacheHeader) {
        cache = parseCollectorCacheToken(cacheHeader, websiteId, secret());
      }
    } else if (pixelId) {
      const pixel = await getPixel(pixelId);

      if (!pixel || pixel.deletedAt) {
        return badRequest({ message: 'Pixel not found.' });
      }
    } else if (linkId) {
      const link = await getLink(linkId);

      if (!link || link.deletedAt) {
        return badRequest({ message: 'Link not found.' });
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

    // The public collector is intentionally unauthenticated. A Redis-backed
    // per-IP ceiling keeps one client from exhausting a tenant's event quota
    // or the process while leaving normal tracker traffic far below it.
    if (redis.enabled) {
      const allowed = await redis.client.rateLimit(
        rateLimitKey('collector:send', hashRateLimitSubject(ip || 'unknown')),
        1200,
        60,
      );

      if (!allowed) {
        return tooManyRequests({ message: 'Too many tracking events.' }, 60);
      }
    }

    const createdAt = timestamp ? new Date(timestamp * 1000) : new Date();
    const now = Date.now();

    // A public collector must not accept arbitrarily old or future events:
    // backdating distorts reports and can burn another tenant's usage window.
    if (
      createdAt.getTime() < now - MAX_EVENT_AGE_MS ||
      createdAt.getTime() > now + MAX_EVENT_FUTURE_MS
    ) {
      return badRequest({
        code: 'timestamp_out_of_range',
        message: 'Event timestamp is outside the accepted window.',
      });
    }

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

    const eventType = linkId
      ? EVENT_TYPE.linkEvent
      : pixelId
        ? EVENT_TYPE.pixelEvent
        : name
          ? EVENT_TYPE.customEvent
          : EVENT_TYPE.pageView;

    // A client event id makes delivery idempotent. The primary key is derived
    // from the entity that owns the row (website, link, or pixel) and the
    // client key, so a retry collides in PostgreSQL instead of creating a
    // second event. The key is tenant-scoped: two entities may use the same
    // client key without colliding.
    const idempotentEventId =
      sourceId && payloadEventId ? getClientEventId(sourceId, payloadEventId) : undefined;

    // Resolve entitlement and reserve the billable event BEFORE creating a
    // session or visitor context. A deleted/suspended workspace must not leave
    // orphan sessions, and a limit rejection must not write partial data.
    // Legacy websites with no workspace keep the inherited behaviour.
    if (websiteId && workspaceId) {
      const entitlements = await getWorkspaceEntitlements(workspaceId);

      if (!entitlements?.plan) {
        return forbidden({
          code: 'workspace-unavailable',
          message: 'This website is not accepting events.',
        });
      }

      if (isBillableEvent(eventType)) {
        if (!entitlements.active) {
          return json({
            ok: false,
            reason: 'subscription_required',
            limit: 0,
            used: 0,
          });
        }

        const reservation = await reserveEventUsage(
          workspaceId,
          entitlements.plan.eventsPerMonth,
          EVENT_GRACE,
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
    }

    let visitorId: string | null = null;
    let sessionId: string;

    if (websiteId) {
      if (cache) {
        visitorId = cache.visitorId;
        sessionId = cache.sessionId;
      } else {
        // Cookieless mode. The tracker sends only an ephemeral tab-scoped
        // session token. When no visitor token arrives, derive a stable
        // per-website visitor key from a rotating salted hash of the request
        // IP and user agent. The raw values are never stored.
        if (!visitorToken) {
          visitorToken = hash(
            websiteId,
            ip || 'unknown',
            userAgent || 'unknown',
            getSalt(process.env.SALT_ROTATION || 'month', createdAt),
            secret(),
          );
        }

        // Server-side callers without a session token get a deterministic
        // 30-minute bucket so events still sessionize without client state.
        if (!sessionToken) {
          sessionToken = hash(
            visitorToken,
            String(Math.floor(createdAt.getTime() / (30 * 60 * 1000))),
          );
        }

        // Derive from the same truncated width that the visitor row and the
        // cross-domain linker store. Otherwise a linked second domain creates
        // events under a visitor UUID that has no visitor row.
        visitorToken = visitorToken.slice(0, TRACKING_TOKEN_MAX_LENGTH);
        sessionToken = sessionToken.slice(0, TRACKING_TOKEN_MAX_LENGTH);

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

      let websiteEventId: string;

      try {
        websiteEventId = await saveEvent({
          eventId: idempotentEventId,
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
      } catch (e) {
        if (idempotentEventId && isUniqueConstraintError(e)) {
          // A retry of an event that already committed. Release the fresh
          // reservation: the first delivery already paid for this event.
          if (reservedWorkspaceId) {
            await releaseEventUsage(reservedWorkspaceId);
            reservedWorkspaceId = null;
          }

          return json({ ok: true, duplicate: true });
        }

        throw e;
      }

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

    logger.error('collector.send_failed', {
      message: e instanceof Error ? e.message : String(e),
    });

    return serverError();
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
