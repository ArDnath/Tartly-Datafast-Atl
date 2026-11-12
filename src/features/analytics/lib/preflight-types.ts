import type { InstallHost } from './install-host';

export const FIRST_PARTY_BASE_PATH = '/_tartly' as const;

export type PreflightReason =
  | 'ok'
  | 'no-domain'
  | 'unreachable'
  | 'local'
  | 'blocked-by-waf'
  | 'invalid-csp';

export interface PreflightCsp {
  present: boolean;
  reportOnly: boolean;
  scriptBlocked: boolean;
  connectBlocked: boolean;
  strictDynamic: boolean;
  currentHeaders: string[];
  suggestedHeaders: string[];
}

export interface PreflightResponse {
  reachable: boolean;
  checkedUrl: string | null;
  reason: PreflightReason;
  csp: PreflightCsp;
  host: InstallHost;
  firstParty: {
    basePath: typeof FIRST_PARTY_BASE_PATH;
    scriptUrl: string | null;
    installed: boolean | null;
  };
  recommendedMode: 'standard' | 'first-party';
}
