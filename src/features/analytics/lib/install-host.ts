/**
 * Best-effort detection of the hosting platform behind a customer site.
 *
 * Detection is a convenience, never a security boundary, and the UI always
 * lets the customer override it. Returning `unknown` is better than guessing:
 * a wrong first-party guide would send someone to the wrong file path.
 */

export type InstallHostId =
  | 'nextjs'
  | 'vercel'
  | 'netlify'
  | 'cloudflare'
  | 'shopify'
  | 'wordpress'
  | 'unknown';

export interface InstallHost {
  id: InstallHostId;
  label: string;
  confidence: 'high' | 'medium' | 'low';
}

const LABELS: Record<InstallHostId, string> = {
  nextjs: 'Next.js',
  vercel: 'Vercel',
  netlify: 'Netlify',
  cloudflare: 'Cloudflare',
  shopify: 'Shopify',
  wordpress: 'WordPress',
  unknown: 'Unknown host',
};

function headerValue(headers: Record<string, string[]>, name: string) {
  for (const [key, values] of Object.entries(headers)) {
    if (key.toLowerCase() === name) {
      return values.join(' ');
    }
  }

  return '';
}

function result(id: InstallHostId, confidence: InstallHost['confidence']): InstallHost {
  return { id, label: LABELS[id], confidence };
}

export function detectInstallHost(
  headers: Record<string, string[]>,
  html?: string | null,
): InstallHost {
  const poweredBy = headerValue(headers, 'x-powered-by').toLowerCase();
  const body = (html || '').toLowerCase();

  if (headerValue(headers, 'x-shopid') || headerValue(headers, 'x-shopify-stage')) {
    return result('shopify', 'high');
  }

  if (headerValue(headers, 'x-nf-request-id')) {
    return result('netlify', 'high');
  }

  const nextMarker =
    poweredBy.includes('next.js') || body.includes('__next_data__') || body.includes('/_next/');

  if (nextMarker) {
    // A Next.js app on Vercel is still best served by the Next.js guide,
    // because the route file path is the part the customer must edit.
    return result(
      'nextjs',
      poweredBy.includes('next.js') || body.includes('__next_data__') ? 'high' : 'medium',
    );
  }

  if (headerValue(headers, 'x-vercel-id')) {
    return result('vercel', 'high');
  }

  const wordpressMarker =
    poweredBy.includes('wordpress') || body.includes('/wp-content/') || body.includes('wp-json');

  if (wordpressMarker) {
    return result('wordpress', body.includes('/wp-content/') ? 'high' : 'medium');
  }

  if (headerValue(headers, 'cf-ray')) {
    return result('cloudflare', 'high');
  }

  return result('unknown', 'low');
}
