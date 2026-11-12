import type { SafeFetchResult } from '@/lib/safe-fetch';
import { isBlockedHostname, isIpLiteral, isPrivateIpAddress } from '@/lib/safe-fetch';
import { analyzeCsp } from './csp';
import { detectInstallHost, type InstallHost } from './install-host';
import {
  FIRST_PARTY_BASE_PATH,
  type PreflightCsp,
  type PreflightReason,
  type PreflightResponse,
} from './preflight-types';

const WAF_STATUSES = new Set([403, 429, 503]);
const UNKNOWN_HOST: InstallHost = {
  id: 'unknown',
  label: 'Unknown host',
  confidence: 'low',
};
const EMPTY_CSP: PreflightCsp = {
  present: false,
  reportOnly: false,
  scriptBlocked: false,
  connectBlocked: false,
  strictDynamic: false,
  currentHeaders: [],
  suggestedHeaders: [],
};

/**
 * Normalize a website's configured domain to a host. The install checker
 * never accepts a URL from the client; this value always comes from the
 * workspace-scoped website row.
 */
export function normalizePreflightDomain(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameOnly(host: string) {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end === -1 ? host : host.slice(1, end);
  }

  const firstColon = host.indexOf(':');
  const lastColon = host.lastIndexOf(':');

  if (firstColon !== -1 && firstColon === lastColon) {
    return host.slice(0, lastColon);
  }

  return host;
}

export function isLocalWebsiteHost(host: string) {
  const hostname = hostnameOnly(host);

  return isBlockedHostname(hostname) || (isIpLiteral(hostname) && isPrivateIpAddress(hostname));
}

export function getFirstPartyScriptUrl(domain: string) {
  return `https://${domain}${FIRST_PARTY_BASE_PATH}/script.js`;
}

function headerContains(result: SafeFetchResult, name: string, needle: string) {
  const values = result.headers?.[name.toLowerCase()] ?? [];

  return values.some(value => value.toLowerCase().includes(needle));
}

function firstPartyInstalled(result: SafeFetchResult | null): boolean | null {
  if (!result?.ok) {
    return null;
  }

  if (result.status === 404) {
    return false;
  }

  if (result.status && result.status >= 200 && result.status < 300) {
    return (
      headerContains(result, 'content-type', 'javascript') ||
      headerContains(result, 'content-type', 'ecmascript')
    );
  }

  return null;
}

function standardResponse({
  host = UNKNOWN_HOST,
  csp = EMPTY_CSP,
  scriptUrl = null,
  installed = null,
  checkedUrl = null,
  reachable = false,
  reason,
}: {
  host?: InstallHost;
  csp?: PreflightCsp;
  scriptUrl?: string | null;
  installed?: boolean | null;
  checkedUrl?: string | null;
  reachable?: boolean;
  reason: PreflightReason;
}): PreflightResponse {
  return {
    reachable,
    checkedUrl,
    reason,
    csp,
    host,
    firstParty: {
      basePath: FIRST_PARTY_BASE_PATH,
      scriptUrl,
      installed,
    },
    recommendedMode: 'standard',
  };
}

/**
 * Turn the safe-fetch outcomes into the stable response contract. This is pure
 * so the handler stays a thin HTTP adapter and the decision table is unit
 * tested directly.
 */
export function buildPreflightResponse({
  domain,
  site,
  firstParty,
}: {
  domain: string | null | undefined;
  site: SafeFetchResult | null;
  firstParty: SafeFetchResult | null;
}): PreflightResponse {
  const normalizedDomain = normalizePreflightDomain(domain);

  if (!normalizedDomain) {
    return standardResponse({ reason: 'no-domain' });
  }

  const scriptUrl = getFirstPartyScriptUrl(normalizedDomain);

  if (isLocalWebsiteHost(normalizedDomain)) {
    return standardResponse({ scriptUrl, reason: 'local' });
  }

  const checkedUrl = `https://${normalizedDomain}/`;
  const installed = firstPartyInstalled(firstParty);

  if (!site?.ok) {
    return standardResponse({
      checkedUrl,
      scriptUrl,
      installed,
      reason: 'unreachable',
    });
  }

  const host = detectInstallHost(site.headers ?? {}, site.body);

  if (site.status && WAF_STATUSES.has(site.status)) {
    return standardResponse({
      checkedUrl,
      scriptUrl,
      installed,
      host,
      reachable: true,
      reason: 'blocked-by-waf',
    });
  }

  if (!site.status || site.status >= 400) {
    return standardResponse({
      checkedUrl,
      scriptUrl,
      installed,
      host,
      reason: 'unreachable',
    });
  }

  const analysis = analyzeCsp(site.headers ?? {}, site.body);
  const csp: PreflightCsp = {
    present: analysis.present,
    reportOnly: analysis.reportOnly,
    scriptBlocked: analysis.scriptBlocked,
    connectBlocked: analysis.connectBlocked,
    strictDynamic: analysis.strictDynamic,
    currentHeaders: analysis.currentHeaders,
    suggestedHeaders: analysis.suggestedHeaders,
  };

  const blocksStandardInstall = analysis.scriptBlocked || analysis.connectBlocked;
  const recommendedMode =
    blocksStandardInstall && !analysis.unknown && !analysis.strictDynamic
      ? 'first-party'
      : 'standard';

  return {
    reachable: true,
    checkedUrl,
    reason: analysis.unknown ? 'invalid-csp' : 'ok',
    csp,
    host,
    firstParty: {
      basePath: FIRST_PARTY_BASE_PATH,
      scriptUrl,
      installed,
    },
    recommendedMode,
  };
}

export type { PreflightResponse } from './preflight-types';
