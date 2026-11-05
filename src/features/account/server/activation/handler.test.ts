import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { getActivationFunnel } from '@/features/account/server/queries/activation';
import { GET } from './handler';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/features/account/server/queries/activation', () => ({
  getActivationFunnel: vi.fn(),
}));

const funnel = {
  generatedAt: '2026-11-06T00:00:00.000Z',
  stages: [],
  totals: { events: 0, payments: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActivationFunnel).mockResolvedValue(funnel);
});

test('rejects a workspace admin who is not a platform admin', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1', isPlatformAdmin: false } },
  });

  const response = await GET(new Request('https://analytics.example.com/api/admin/activation'));

  expect(response.status).toBe(403);
  expect(getActivationFunnel).not.toHaveBeenCalled();
});

test('returns the aggregate funnel to a platform admin', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'operator-1', isPlatformAdmin: true } },
  });

  const response = await GET(new Request('https://analytics.example.com/api/admin/activation'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual(funnel);
  expect(getActivationFunnel).toHaveBeenCalledOnce();
});
