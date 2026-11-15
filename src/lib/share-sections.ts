export const SHARE_SECTION_IDS = [
  'overview',
  'events',
  'sessions',
  'realtime',
  'performance',
  'compare',
  'breakdown',
  'goals',
  'funnels',
  'journeys',
  'retention',
  'utm',
  'revenue',
  'attribution',
] as const;

export type ShareSectionId = (typeof SHARE_SECTION_IDS)[number];

const REPORT_SECTION_BY_TYPE: Record<string, ShareSectionId> = {
  attribution: 'attribution',
  breakdown: 'breakdown',
  funnel: 'funnels',
  goal: 'goals',
  journey: 'journeys',
  performance: 'performance',
  retention: 'retention',
  revenue: 'revenue',
  utm: 'utm',
};

const REPORT_SECTIONS = Object.values(REPORT_SECTION_BY_TYPE);

/**
 * Raw identity and URL-query values are never shareable. The share response
 * redactor masks named fields, but metrics endpoints return the requested
 * value under a generic `x` key and values endpoints return primitive arrays,
 * so those fields must be blocked at the request boundary instead.
 */
const SHARE_BLOCKED_FIELDS = new Set(['distinctId', 'query']);

function hasBlockedShareField(query?: Record<string, unknown>) {
  return SHARE_BLOCKED_FIELDS.has(String(query?.type ?? ''));
}

export function getAllowedShareSections(
  parameters?: Record<string, unknown> | null,
): ShareSectionId[] {
  const configured = SHARE_SECTION_IDS.filter(id => parameters?.[id] === true);

  return configured.length ? configured : ['overview'];
}

export function isShareSectionId(value: unknown): value is ShareSectionId {
  return typeof value === 'string' && (SHARE_SECTION_IDS as readonly string[]).includes(value);
}

export function getShareSectionForReportType(type?: unknown): ShareSectionId | null {
  return typeof type === 'string' ? REPORT_SECTION_BY_TYPE[type] || null : null;
}

export function isShareSectionAllowed(
  parameters: Record<string, unknown> | null | undefined,
  sections: readonly ShareSectionId[],
) {
  const allowed = new Set(getAllowedShareSections(parameters));

  return sections.some(section => allowed.has(section));
}

function getWebsiteEndpointSections(endpoint: string): ShareSectionId[] | null {
  if (endpoint === 'stats' || endpoint === 'pageviews') {
    return ['overview', 'compare'];
  }

  if (endpoint === 'dashboard-breakdown' || endpoint.startsWith('metrics')) {
    return ['overview', 'compare'];
  }

  if (endpoint === 'events/series') {
    return ['overview', 'events'];
  }

  if (endpoint === 'events' || endpoint === 'events/stats' || endpoint.startsWith('event-data')) {
    return ['events'];
  }

  if (endpoint === 'sessions/stats') {
    return ['events', 'sessions'];
  }

  if (
    endpoint === 'sessions' ||
    endpoint === 'sessions/weekly' ||
    /^sessions\/[^/]+(?:\/(?:activity|properties))?$/.test(endpoint) ||
    endpoint.startsWith('session-data')
  ) {
    return ['overview', 'sessions'];
  }

  if (endpoint === 'active') {
    return ['realtime'];
  }

  if (endpoint === 'revenue/sessions') {
    return ['revenue'];
  }

  if (endpoint === 'revenue-attribution' || endpoint === 'revenue-attribution/journey') {
    return ['attribution'];
  }

  return null;
}

export function canAccessWebsiteShareRequest({
  pathname,
  method,
  query,
  body,
  parameters,
}: {
  pathname: string;
  method: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}) {
  const normalizedMethod = method.toUpperCase();

  if (pathname.startsWith('/api/realtime/')) {
    return normalizedMethod === 'GET' && isShareSectionAllowed(parameters, ['realtime']);
  }

  if (pathname === '/api/reports') {
    const section = getShareSectionForReportType(query?.type);

    return normalizedMethod === 'GET' && !!section && isShareSectionAllowed(parameters, [section]);
  }

  const reportMatch = pathname.match(/^\/api\/reports\/([^/]+)$/);

  if (reportMatch) {
    const section = getShareSectionForReportType(reportMatch[1]);

    if (section) {
      return (
        normalizedMethod === 'POST' &&
        getShareSectionForReportType(body?.type) === section &&
        isShareSectionAllowed(parameters, [section])
      );
    }

    // Saved report routes are checked again against the report type after the
    // record is loaded. Mutations remain unavailable to share tokens.
    return normalizedMethod === 'GET' && isShareSectionAllowed(parameters, REPORT_SECTIONS);
  }

  const websiteMatch = pathname.match(/^\/api\/websites\/[^/]+(?:\/(.*))?$/);

  if (!websiteMatch || normalizedMethod !== 'GET') {
    return false;
  }

  const endpoint = websiteMatch[1] || '';

  // Website metadata, date bounds, filter values, and saved segments are shared
  // infrastructure required by every analytics section. Identity and raw query
  // values are the exception.
  if (endpoint === 'values') {
    return !hasBlockedShareField(query);
  }

  if (
    endpoint === '' ||
    endpoint === 'daterange' ||
    endpoint === 'segments' ||
    endpoint.startsWith('segments/')
  ) {
    return true;
  }

  if (endpoint === 'reports') {
    const section = getShareSectionForReportType(query?.type);

    return !!section && isShareSectionAllowed(parameters, [section]);
  }

  if (endpoint.startsWith('metrics') || endpoint === 'dashboard-breakdown') {
    if (hasBlockedShareField(query)) {
      return false;
    }
  }

  const sections = getWebsiteEndpointSections(endpoint);

  return !!sections && isShareSectionAllowed(parameters, sections);
}
