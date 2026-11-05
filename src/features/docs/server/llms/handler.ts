import { buildLlmsTxt } from '@/features/docs/llms';
import { getPublicOrigin } from '@/lib/get-base-url';

export const dynamic = 'force-static';

export function GET(request: Request) {
  const origin = getPublicOrigin(request);

  return new Response(buildLlmsTxt(origin), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
