import { beforeEach, expect, test, vi } from 'vitest';
import { getWorkspaceEntitlements } from '@/lib/entitlements';
import { parseRequest } from '@/lib/request';
import { requireWebsiteAccess } from '@/lib/workspace-auth';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/lib/workspace-auth', () => ({
  requireWebsiteAccess: vi.fn(),
}));

vi.mock('@/lib/entitlements', () => ({
  getWorkspaceEntitlements: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      websiteEvent: {
        count: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}));

const prismaModule = (await import('@/lib/prisma')) as any;
const client = prismaModule.default.client;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({ auth: { user: { id: 'user-1' } } } as any);
  vi.mocked(requireWebsiteAccess).mockResolvedValue({
    workspaceId: 'workspace-1',
    websiteId: 'website-1',
  } as any);
  client.websiteEvent.count.mockResolvedValue(0);
  client.websiteEvent.findFirst.mockResolvedValue(null);
});

async function call() {
  const response = await GET(new Request('https://app.example/api/verify'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
  return { response, body: await response.json() };
}

test('an unpaid workspace is told that events start after checkout', async () => {
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({ active: false } as any);

  const { body } = await call();

  expect(body.installed).toBe(false);
  expect(body.requiresPayment).toBe(true);
});

test('a paid workspace reports the real event-store state', async () => {
  vi.mocked(getWorkspaceEntitlements).mockResolvedValue({ active: true } as any);
  client.websiteEvent.count.mockResolvedValue(3);

  const { body } = await call();

  expect(body.installed).toBe(true);
  expect(body.eventCount).toBe(3);
  expect(body.requiresPayment).toBe(false);
});
