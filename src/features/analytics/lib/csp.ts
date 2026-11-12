import { BRAND } from '@/lib/brand';

/**
 * Pragmatic Content-Security-Policy analysis for the tracker install flow.
 *
 * The analyzer only answers one question: would the browser allow the
 * standard third-party script and its event endpoint? It deliberately reports
 * `unknown` instead of guessing `blocked`, because a false "blocked" would
 * push a site toward the first-party install without need.
 *
 * Browsers enforce the intersection of every delivered policy. A blocked
 * target in any enforced policy therefore blocks the target overall.
 */

export type CspDecision = 'allowed' | 'blocked' | 'unknown';

export interface ParsedCspPolicy {
  raw: string;
  reportOnly: boolean;
  /** Directive name -> source expressions, in declaration order. */
  directives: Record<string, string[]>;
  order: string[];
  malformed: boolean;
}

export interface CspTargets {
  scriptUrl?: string;
  connectUrl?: string;
}

export interface CspAnalysis {
  present: boolean;
  reportOnly: boolean;
  scriptBlocked: boolean;
  connectBlocked: boolean;
  strictDynamic: boolean;
  /** True when at least one target could not be determined confidently. */
  unknown: boolean;
  currentHeaders: string[];
  suggestedHeaders: string[];
  enforced: ParsedCspPolicy[];
  reportOnlyPolicies: ParsedCspPolicy[];
}

export const TARTLY_SCRIPT_SOURCE = BRAND.url;
export const TARTLY_SCRIPT_URL = `${BRAND.url}/script.js`;
export const TARTLY_CONNECT_URL = `${BRAND.url}/api/send`;

const SCRIPT_CHAIN = ['script-src-elem', 'script-src', 'default-src'];
const CONNECT_CHAIN = ['connect-src', 'default-src'];
const HOST_SOURCE = BRAND.url;

const DIRECTIVE_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

const VALUELESS_DIRECTIVES = new Set([
  'upgrade-insecure-requests',
  'block-all-mixed-content',
  'sandbox',
]);

function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0);

    if (
      (code >= 0 && code <= 8) ||
      (code >= 11 && code <= 12) ||
      (code >= 14 && code <= 31) ||
      code === 127
    ) {
      return true;
    }
  }

  return false;
}

function splitPolicyList(value: string): string[] {
  // A single header may carry a comma-separated policy list. Only split when
  // the next segment starts with a directive name, so report-uri URLs that
  // contain a comma are left alone.
  return value
    .split(/,(?=\s*[a-zA-Z][a-zA-Z0-9-]*\s)/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function parseCspPolicy(raw: string, reportOnly = false): ParsedCspPolicy {
  const policy: ParsedCspPolicy = {
    raw,
    reportOnly,
    directives: {},
    order: [],
    malformed: false,
  };

  if (hasControlCharacters(raw)) {
    policy.malformed = true;
    return policy;
  }

  for (const part of raw.split(';')) {
    const trimmed = part.trim();

    if (!trimmed) {
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    const name = tokens[0].toLowerCase();

    if (!DIRECTIVE_NAME.test(name)) {
      policy.malformed = true;
      continue;
    }

    const sources = tokens.slice(1);

    for (const source of sources) {
      const lower = source.toLowerCase();
      const quoted = lower.startsWith("'") || lower.endsWith("'");

      if (
        source.includes(',') ||
        source.includes(';') ||
        (quoted && !(lower.startsWith("'") && lower.endsWith("'")))
      ) {
        policy.malformed = true;
      }
    }

    // CSP ignores duplicate directives; keep the first one.
    if (Object.hasOwn(policy.directives, name)) {
      continue;
    }

    if (sources.length === 0 && !VALUELESS_DIRECTIVES.has(name)) {
      policy.malformed = true;
    }

    policy.directives[name] = sources;
    policy.order.push(name);
  }

  return policy;
}

/**
 * Extract enforced CSP policies declared with a meta tag. Attribute order,
 * quoting style, and case are all handled because real pages vary.
 */
export function extractMetaCsp(html: string | null | undefined): string[] {
  if (!html) {
    return [];
  }

  const policies: string[] = [];
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attributes: Record<string, string> = {};
    const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

    let match = attributePattern.exec(tag);
    while (match) {
      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? '';
      attributes[name] = decodeHtmlEntities(value);
      match = attributePattern.exec(tag);
    }

    if (attributes['http-equiv']?.toLowerCase() === 'content-security-policy') {
      const content = attributes.content?.trim();
      if (content) {
        policies.push(content);
      }
    }
  }

  return policies;
}

const HTML_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};

function decodeHtmlEntities(value: string) {
  // Decode in one pass. Sequential replaces can double-unescape values such
  // as `&amp;quot;` and are flagged by CodeQL (js/double-escaping).
  return value.replace(/&(?:quot|#0*39|#x0*27|apos|amp|lt|gt);/gi, entity => {
    const normalized = entity
      .toLowerCase()
      .replace(/^&#0+/, '&#')
      .replace(/^&#x0+/, '&#x');

    return HTML_ENTITIES[normalized] ?? entity;
  });
}

function headerValues(headers: Record<string, string[]>, name: string) {
  const values: string[] = [];

  for (const [key, items] of Object.entries(headers)) {
    if (key.toLowerCase() === name) {
      values.push(...items);
    }
  }

  return values;
}

export function collectCspPolicies(
  headers: Record<string, string[]>,
  html?: string | null,
): {
  enforced: ParsedCspPolicy[];
  reportOnly: ParsedCspPolicy[];
  currentHeaders: string[];
} {
  const enforcedValues = headerValues(headers, 'content-security-policy').flatMap(splitPolicyList);
  const reportOnlyValues = headerValues(headers, 'content-security-policy-report-only').flatMap(
    splitPolicyList,
  );
  const metaValues = extractMetaCsp(html).flatMap(splitPolicyList);

  const enforced = [...enforcedValues, ...metaValues].map(value => parseCspPolicy(value, false));
  const reportOnly = reportOnlyValues.map(value => parseCspPolicy(value, true));

  return {
    enforced,
    reportOnly,
    currentHeaders: [...enforcedValues, ...reportOnlyValues, ...metaValues],
  };
}

function effectiveDirective(policy: ParsedCspPolicy, chain: string[]) {
  for (const name of chain) {
    if (Object.hasOwn(policy.directives, name)) {
      return { name, sources: policy.directives[name] };
    }
  }

  return null;
}

function defaultPort(protocol: string) {
  if (protocol === 'https:') {
    return '443';
  }

  if (protocol === 'http:') {
    return '80';
  }

  return '';
}

/**
 * Match one CSP source expression against an absolute URL.
 *
 * Returning null means "this expression is valid CSP but outside the subset
 * this analyzer understands", which escalates the result to `unknown`.
 */
export function sourceMatches(source: string, target: URL): boolean | null {
  const value = source.trim();
  const lower = value.toLowerCase();

  if (!value) {
    return false;
  }

  if (lower === "'none'") {
    return false;
  }

  if (lower === "'self'") {
    // The standard install is cross-origin from every customer site.
    return false;
  }

  if (
    lower === "'unsafe-inline'" ||
    lower === "'unsafe-eval'" ||
    lower === "'wasm-unsafe-eval'" ||
    lower === "'strict-dynamic'" ||
    lower === "'report-sample'" ||
    lower.startsWith("'nonce-") ||
    lower.startsWith("'sha256-") ||
    lower.startsWith("'sha384-") ||
    lower.startsWith("'sha512-")
  ) {
    return false;
  }

  if (value === '*') {
    return ['http:', 'https:', 'ws:', 'wss:'].includes(target.protocol);
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:$/.test(value)) {
    return target.protocol === lower;
  }

  let rest = value;
  let scheme: string | null = null;
  const schemeMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);

  if (schemeMatch) {
    scheme = schemeMatch[1].toLowerCase();
    rest = rest.slice(schemeMatch[0].length);
  }

  const slashIndex = rest.indexOf('/');
  const hostPort = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
  const rawPath = slashIndex === -1 ? '' : rest.slice(slashIndex);
  const path = rawPath.split(/[?#]/)[0];
  let host = hostPort;
  let port = '';

  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end === -1) {
      return null;
    }
    host = hostPort.slice(0, end + 1);
    port = hostPort.slice(end + 1).startsWith(':') ? hostPort.slice(end + 2) : '';
  } else {
    const colon = hostPort.lastIndexOf(':');
    if (colon !== -1) {
      host = hostPort.slice(0, colon);
      port = hostPort.slice(colon + 1);
    }
  }

  host = host.toLowerCase().replace(/\.$/, '');

  if (!host) {
    return null;
  }

  if (scheme) {
    const targetScheme = target.protocol.replace(':', '');
    const upgraded = scheme === 'http' && targetScheme === 'https';

    if (scheme !== targetScheme && !upgraded) {
      return false;
    }
  }

  const targetHost = target.hostname.toLowerCase();

  if (host === '*') {
    // Any host, still constrained by scheme and port below.
  } else if (host.startsWith('*.')) {
    const suffix = host.slice(2);
    if (targetHost !== suffix && !targetHost.endsWith(`.${suffix}`)) {
      return false;
    }
  } else if (host.includes('*')) {
    // Multiple wildcard labels are valid CSP but outside this analyzer.
    return null;
  } else if (targetHost !== host) {
    return false;
  }

  const targetPort = target.port || defaultPort(target.protocol);

  if (port && port !== '*') {
    if (port !== targetPort) {
      return false;
    }
  } else if (!port && target.port && target.port !== defaultPort(target.protocol)) {
    return false;
  }

  if (path) {
    if (path.endsWith('/')) {
      if (!target.pathname.startsWith(path)) {
        return false;
      }
    } else if (path === '/*') {
      // Wildcard paths are not part of CSP's path grammar, but some sites use
      // them. Treat as a prefix rather than a hard block.
      if (!target.pathname.startsWith('/')) {
        return false;
      }
    } else if (target.pathname !== path) {
      return false;
    }
  }

  return true;
}

export function sourceListDecision(sources: string[], target: URL): CspDecision {
  if (sources.length === 0) {
    return 'unknown';
  }

  if (sources.length === 1 && sources[0].toLowerCase() === "'none'") {
    return 'blocked';
  }

  let sawUnknown = false;

  for (const source of sources) {
    if (source.toLowerCase() === "'none'") {
      continue;
    }

    const result = sourceMatches(source, target);

    if (result === true) {
      return 'allowed';
    }

    if (result === null) {
      sawUnknown = true;
    }
  }

  return sawUnknown ? 'unknown' : 'blocked';
}

function evaluateDirective(sources: string[], target: URL, isScript: boolean): CspDecision {
  if (isScript && sources.some(source => source.toLowerCase() === "'strict-dynamic'")) {
    // A static third-party <script> has no nonce, so strict-dynamic blocks it
    // even when a host allowlist is also present.
    return 'blocked';
  }

  return sourceListDecision(sources, target);
}

function evaluatePolicy(
  policy: ParsedCspPolicy,
  chain: string[],
  target: URL,
  isScript: boolean,
): CspDecision {
  if (policy.malformed) {
    return 'unknown';
  }

  const directive = effectiveDirective(policy, chain);

  if (!directive) {
    return 'allowed';
  }

  return evaluateDirective(directive.sources, target, isScript);
}

function combineDecisions(decisions: CspDecision[]): CspDecision {
  if (decisions.some(decision => decision === 'blocked')) {
    return 'blocked';
  }

  if (decisions.some(decision => decision === 'unknown')) {
    return 'unknown';
  }

  return 'allowed';
}

/**
 * Build a policy string that preserves every directive and source, appending
 * the analytics origin only where the standard install is currently blocked.
 */
export function suggestCspHeader(policy: ParsedCspPolicy, targets: CspTargets = {}): string | null {
  if (policy.malformed) {
    return null;
  }

  const scriptUrl = new URL(targets.scriptUrl || TARTLY_SCRIPT_URL);
  const connectUrl = new URL(targets.connectUrl || TARTLY_CONNECT_URL);
  const additions = new Map<string, Set<string>>();

  const add = (directiveName: string) => {
    const current = additions.get(directiveName) ?? new Set<string>();
    current.add(HOST_SOURCE);
    additions.set(directiveName, current);
  };

  const scriptDirective = effectiveDirective(policy, SCRIPT_CHAIN);
  if (
    scriptDirective &&
    evaluateDirective(scriptDirective.sources, scriptUrl, true) === 'blocked'
  ) {
    add(scriptDirective.name);
  }

  const connectDirective = effectiveDirective(policy, CONNECT_CHAIN);
  if (
    connectDirective &&
    evaluateDirective(connectDirective.sources, connectUrl, false) === 'blocked'
  ) {
    add(connectDirective.name);
  }

  if (additions.size === 0) {
    return null;
  }

  const rendered = policy.order.map(name => {
    const sources = [...policy.directives[name]];
    const extra = additions.get(name);

    if (extra) {
      sources.push(...extra);
    }

    return sources.length > 0 ? `${name} ${sources.join(' ')}` : name;
  });

  return rendered.join('; ');
}

export function analyzeCsp(
  headers: Record<string, string[]>,
  html?: string | null,
  targets: CspTargets = {},
): CspAnalysis {
  const { enforced, reportOnly, currentHeaders } = collectCspPolicies(headers, html);
  const scriptUrl = new URL(targets.scriptUrl || TARTLY_SCRIPT_URL);
  const connectUrl = new URL(targets.connectUrl || TARTLY_CONNECT_URL);

  const scriptDecision = combineDecisions(
    enforced.map(policy => evaluatePolicy(policy, SCRIPT_CHAIN, scriptUrl, true)),
  );
  const connectDecision = combineDecisions(
    enforced.map(policy => evaluatePolicy(policy, CONNECT_CHAIN, connectUrl, false)),
  );

  const strictDynamic = enforced.some(policy => {
    const directive = effectiveDirective(policy, SCRIPT_CHAIN);

    return Boolean(directive?.sources.some(source => source.toLowerCase() === "'strict-dynamic'"));
  });

  const suggestedHeaders: string[] = [];

  for (const policy of enforced) {
    const suggested = suggestCspHeader(policy, targets);

    if (suggested && !suggestedHeaders.includes(suggested)) {
      suggestedHeaders.push(suggested);
    }
  }

  return {
    present: enforced.length > 0 || reportOnly.length > 0,
    reportOnly: enforced.length === 0 && reportOnly.length > 0,
    scriptBlocked: scriptDecision === 'blocked',
    connectBlocked: connectDecision === 'blocked',
    strictDynamic,
    unknown: scriptDecision === 'unknown' || connectDecision === 'unknown',
    currentHeaders,
    suggestedHeaders,
    enforced,
    reportOnlyPolicies: reportOnly,
  };
}
