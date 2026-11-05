import { beforeEach, expect, test, vi } from 'vitest';
import { ENTITY_TYPE, SHARE_TOKEN_HEADER } from '@/lib/constants';
import { secret } from '@/lib/crypto';
import { createToken } from '@/lib/jwt';

vi.mock('@/queries/prisma/share', () => ({ getShare: vi.fn() }));
vi.mock('@/queries/prisma/user', () => ({ getUser: vi.fn() }));
vi.mock('@/lib/auth-session', () => ({ resolveAuthSession: vi.fn() }));

const { getShare } = await import('@/queries/prisma/share');
const { getUser } = await import('@/queries/prisma/user');
const { resolveAuthSession } = await import('@/lib/auth-session');
const { parseShareToken, checkAuth } = await import('./auth');
const { createSecureToken } = await import('./jwt');

function requestFor(payload: Record<string, unknown>) {
  return new Request('https://analytics.example.com/api/websites/website-1/stats', {
    headers: {
      [SHARE_TOKEN_HEADER]: createToken(payload, secret()),
    },
  });
}

const validPayload = {
  purpose: 'share',
  shareId: 'share-1',
  shareSlug: 'public-demo',
  shareType: ENTITY_TYPE.website,
  websiteId: 'website-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getShare).mockResolvedValue({
    id: 'share-1',
    entityId: 'website-1',
    slug: 'public-demo',
    shareType: ENTITY_TYPE.website,
    parameters: {},
  } as any);
});

test('accepts a valid token for an active share record', async () => {
  await expect(parseShareToken(requestFor(validPayload))).resolves.toMatchObject(validPayload);
});

test('uses current share parameters instead of stale token parameters', async () => {
  vi.mocked(getShare).mockResolvedValue({
    id: 'share-1',
    entityId: 'website-1',
    slug: 'public-demo',
    shareType: ENTITY_TYPE.website,
    parameters: {
      revenue: true,
    },
  } as any);

  await expect(
    parseShareToken(
      requestFor({
        ...validPayload,
        parameters: {
          sessions: true,
        },
      }),
    ),
  ).resolves.toMatchObject({
    parameters: {
      revenue: true,
    },
  });
});

test('rejects collector and linker tokens before querying the share record', async () => {
  await expect(
    parseShareToken(
      requestFor({
        purpose: 'collector-cache',
        websiteId: 'website-1',
        sessionId: 'session-1',
      }),
    ),
  ).resolves.toBeNull();

  await expect(
    parseShareToken(
      requestFor({
        purpose: 'cross-domain',
        websiteId: 'website-1',
        visitorToken: 'visitor-1',
      }),
    ),
  ).resolves.toBeNull();

  expect(getShare).not.toHaveBeenCalled();
});

test('rejects a token after its share record is deleted', async () => {
  vi.mocked(getShare).mockResolvedValue(null);

  await expect(parseShareToken(requestFor(validPayload))).resolves.toBeNull();
});

test('rejects a signed token whose entity no longer matches the share record', async () => {
  vi.mocked(getShare).mockResolvedValue({
    id: 'share-1',
    entityId: 'website-2',
    slug: 'public-demo',
    shareType: ENTITY_TYPE.website,
  } as any);

  await expect(parseShareToken(requestFor(validPayload))).resolves.toBeNull();
});

test('rejects a token minted before the public slug was rotated', async () => {
  vi.mocked(getShare).mockResolvedValue({
    id: 'share-1',
    entityId: 'website-1',
    slug: 'rotated-demo-link',
    shareType: ENTITY_TYPE.website,
  } as any);

  await expect(parseShareToken(requestFor(validPayload))).resolves.toBeNull();
});

test('rejects legacy board share tokens', async () => {
  vi.mocked(getShare).mockResolvedValue({
    id: 'share-board',
    entityId: 'board-1',
    slug: 'public-board',
    shareType: ENTITY_TYPE.board,
  } as any);

  await expect(
    parseShareToken(
      requestFor({
        purpose: 'share',
        shareId: 'share-board',
        shareSlug: 'public-board',
        shareType: ENTITY_TYPE.board,
        boardId: 'board-1',
      }),
    ),
  ).resolves.toBeNull();
});

function cookieRequest(cookie: string) {
  return new Request('https://app.example.com/api/me', {
    headers: { cookie },
  });
}

test('authenticates a request from the HttpOnly session cookie', async () => {
  vi.mocked(resolveAuthSession).mockResolvedValue({ id: 'session-1', userId: 'user-1' });
  vi.mocked(getUser).mockResolvedValue({
    id: 'user-1',
    username: 'owner@example.com',
    role: 'user',
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  } as any);

  const auth = await checkAuth(cookieRequest('rl_session=session-token'));

  expect(resolveAuthSession).toHaveBeenCalledWith('session-token');
  expect(getUser).toHaveBeenCalledWith('user-1');
  expect(auth).toMatchObject({
    source: 'cookie',
    sessionId: 'session-1',
    sessionToken: 'session-token',
    user: {
      id: 'user-1',
      isAdmin: false,
    },
  });
});

test('rejects an unknown cookie session', async () => {
  vi.mocked(resolveAuthSession).mockResolvedValue(null);

  await expect(checkAuth(cookieRequest('rl_session=expired'))).resolves.toBeNull();
});

test('still accepts a signed bearer token for API clients', async () => {
  vi.mocked(getUser).mockResolvedValue({
    id: 'user-2',
    username: 'api@example.com',
    role: 'user',
  } as any);

  const token = createSecureToken({ userId: 'user-2' }, secret());
  const auth = await checkAuth(
    new Request('https://app.example.com/api/me', {
      headers: { authorization: `Bearer ${token}` },
    }),
  );

  expect(auth).toMatchObject({ source: 'bearer', user: { id: 'user-2' } });
});
