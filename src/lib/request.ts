import { z } from 'zod';
import { isAppConfigurationError } from '@/lib/app-config';
import { checkAuth } from '@/lib/auth';
import { isSameOriginRequest, isUnsafeMethod } from '@/lib/csrf';
import { DEFAULT_PAGE_SIZE, ENTITY_TYPE, FILTER_COLUMNS, OPERATORS } from '@/lib/constants';
import {
  getAllowedUnits,
  getMinimumUnit,
  isValidTimezone,
  maxDate,
  normalizeTimezone,
  parseDateRange,
} from '@/lib/date';
import { fetchWebsite } from '@/lib/load';
import { filtersArrayToObject } from '@/lib/params';
import { appConfigurationError, badRequest, forbidden, unauthorized } from '@/lib/response';
import { canAccessWebsiteShareRequest } from '@/lib/share-sections';
import type { QueryFilters } from '@/lib/types';
import { getWebsiteSegment } from '@/queries/prisma';

const PRIVATE_SHARE_PATHS = [
  /\/api\/websites\/[^/]+\/(?:backup|export|api-keys|payment-provider-connections|members|shares|imports|attribution-settings|currency)(?:\/|$)/,
  /\/api\/websites\/[^/]+\/reset(?:\/|$)/,
  /\/api\/websites\/[^/]+\/replays(?:\/|$)/,
  /\/api\/websites\/[^/]+\/sessions\/[^/]+\/replays(?:\/|$)/,
  /\/api\/websites\/[^/]+\/revenue-attribution\/(?:diagnostics|setup|retry|recalculate)(?:\/|$)/,
  /\/api\/(?:pixels|links)\/[^/]+\/shares(?:\/|$)/,
  /\/api\/share\/id\/[^/]+(?:\/|$)/,
];

export function isPrivateSharePath(pathname: string) {
  return PRIVATE_SHARE_PATHS.some(pattern => pattern.test(pathname));
}

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

/**
 * Reject an oversized body before buffering it. Content-Length is advisory for
 * chunked requests, so callers that read raw text should still cap the result;
 * this catches the common browser/server case cheaply at the edge of the app.
 */
async function readTextWithLimit(request: Request, maxBytes: number) {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}

/** Read a raw body with a hard byte cap, including chunked requests. */
export async function readRequestBody(request: Request, maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES) {
  return readTextWithLimit(request, maxBytes);
}

export function getBodyLimitError(request: Request, maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES) {
  const declared = Number(request.headers.get('content-length') ?? 0);

  if (Number.isFinite(declared) && declared > maxBytes) {
    return badRequest({
      code: 'payload-too-large',
      message: 'Request body is too large.',
    });
  }

  return null;
}

export async function parseRequest(
  request: Request,
  schema?: any,
  options?: { skipAuth: boolean; maxBodyBytes?: number },
): Promise<any> {
  const url = new URL(request.url);
  let query = Object.fromEntries(url.searchParams);
  const limitError =
    request.method === 'GET'
      ? null
      : getBodyLimitError(request, options?.maxBodyBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES);

  if (limitError) {
    return { url, query, body: undefined, auth: null, error: () => limitError };
  }

  let body = await getJsonBody(request, options?.maxBodyBytes);
  let error: () => undefined | undefined | Response;
  let auth = null;

  if (schema) {
    const isGet = request.method === 'GET';
    const rawQuery = query;
    const result = schema.safeParse(isGet ? query : body);

    if (!result.success) {
      error = () => badRequest(z.treeifyError(result.error));
    } else if (isGet) {
      query = result.data;

      // Re-add suffixed filter params (e.g., browser1, os2) stripped by Zod schema
      for (const key of Object.keys(rawQuery)) {
        if (/\d+$/.test(key) && !(key in query)) {
          query[key] = rawQuery[key];
        }
      }
    } else {
      body = result.data;
    }
  }

  if (!options?.skipAuth && !error) {
    try {
      auth = await checkAuth(request);
    } catch (cause) {
      if (isAppConfigurationError(cause)) {
        error = () => appConfigurationError();
      } else {
        throw cause;
      }
    }

    if (!error && !auth) {
      error = () => unauthorized();
    } else if (
      !error &&
      auth?.source === 'cookie' &&
      isUnsafeMethod(request.method) &&
      !isSameOriginRequest(request)
    ) {
      error = () =>
        forbidden({
          message: 'Cross-site request rejected.',
          code: 'csrf-rejected',
        });
    } else if (!error && auth.shareToken && isPrivateSharePath(url.pathname)) {
      error = () =>
        forbidden({
          message: 'This endpoint is not available from a shared dashboard.',
          code: 'share-endpoint-private',
        });
    } else if (
      !error &&
      auth.shareToken &&
      auth.shareToken.shareType !== ENTITY_TYPE.website &&
      url.pathname.startsWith('/api/websites/')
    ) {
      // A legacy link/pixel token must never become a website analytics
      // capability simply because its entity id matches a website id.
      error = () =>
        forbidden({
          message: 'This shared dashboard cannot read website analytics.',
          code: 'share-section-forbidden',
        });
    } else if (
      !error &&
      auth.shareToken?.shareType === ENTITY_TYPE.website &&
      !canAccessWebsiteShareRequest({
        pathname: url.pathname,
        method: request.method,
        query,
        body,
        parameters: auth.shareToken.parameters,
      })
    ) {
      error = () =>
        forbidden({
          message: 'This section is not available from this shared dashboard.',
          code: 'share-section-forbidden',
        });
    }
  }

  return { url, query, body, auth, error };
}

export async function getJsonBody(request: Request, maxBytes?: number) {
  try {
    const text = await readTextWithLimit(
      request.clone(),
      maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES,
    );

    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

export function getRequestDateRange(query: Record<string, string>) {
  const { startAt, endAt, unit, timezone } = query;

  const startDate = new Date(+startAt);
  const endDate = new Date(+endAt);

  return {
    startDate,
    endDate,
    // This is a defense-in-depth boundary, not only a UI preference: the
    // timezone is interpolated into the SQL of several analytics queries.
    // Ignore anything that is not an IANA zone instead of forwarding it.
    timezone: timezone && isValidTimezone(timezone) ? normalizeTimezone(timezone) : undefined,
    unit: getAllowedUnits(startDate, endDate).includes(unit)
      ? unit
      : getMinimumUnit(startDate, endDate),
  };
}

export function getRequestFilters(query: Record<string, any>) {
  const result: Record<string, any> = {};

  for (const key of Object.keys(query)) {
    const baseName = key.replace(/\d+$/, '');
    if (baseName in FILTER_COLUMNS) {
      result[key] = query[key];
    }
  }

  return result;
}

export async function setWebsiteDate(websiteId: string, data: Record<string, any>) {
  const website = await fetchWebsite(websiteId);

  if (website?.resetAt) {
    data.startDate = maxDate(data.startDate, new Date(website?.resetAt));
  }

  return data;
}

export async function getQueryFilters(
  params: Record<string, any>,
  websiteId?: string,
): Promise<QueryFilters> {
  const dateRange = getRequestDateRange(params);
  const filters = getRequestFilters(params);

  let match = params?.match;

  if (websiteId) {
    await setWebsiteDate(websiteId, dateRange);

    if (params.segment) {
      const segmentParams = (await getWebsiteSegment(websiteId, params.segment))
        ?.parameters as Record<string, any>;

      Object.assign(filters, filtersArrayToObject(segmentParams.filters));

      if (segmentParams.match) {
        match = segmentParams.match;
      }
    }

    if (params.cohort) {
      const cohortParams = (await getWebsiteSegment(websiteId, params.cohort))
        ?.parameters as Record<string, any>;

      const { startDate, endDate } = parseDateRange(cohortParams.dateRange);

      const cohortFilters = cohortParams.filters.map(({ name, ...props }) => ({
        ...props,
        name: `cohort_${name}`,
      }));

      cohortFilters.push({
        name: `cohort_${cohortParams.action.type}`,
        operator: OPERATORS.equals,
        value: cohortParams.action.value,
      });

      Object.assign(filters, {
        ...filtersArrayToObject(cohortFilters),
        cohort_startDate: startDate,
        cohort_endDate: endDate,
        ...(cohortParams.match && {
          cohort_match: cohortParams.match,
          cohort_actionName: `cohort_${cohortParams.action.type}`,
        }),
      });
    }

    if (params.excludeBounce) {
      Object.assign(filters, { excludeBounce: true });
    }
  }

  return {
    ...dateRange,
    ...filters,
    match,
    page: params?.page,
    pageSize: params?.pageSize ? params?.pageSize || DEFAULT_PAGE_SIZE : undefined,
    orderBy: params?.orderBy,
    sortDescending: params?.sortDescending,
    search: params?.search,
    compare: params?.compare,
  };
}
