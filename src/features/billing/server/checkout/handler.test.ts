import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { findBillingProduct, getBillingConfig } from '@/features/billing/server/provider';
import { getDodoBillingProvider } from '@/features/billing/server/providers/dodo';
import { recordAuditEvent } from '@/queries/prisma';
import { POST } from './handler';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent: vi.fn() }));
vi.mock('@/features/billing/server/provider', () => ({
  getBillingConfig: vi.fn(),
  findBillingProduct: vi.fn(),
}));
vi.mock('@/features/billing/server/providers/dodo', () => ({
  getDodoBillingProvider: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      platformSubscription: { findUnique: vi.fn() },
      billingCustomer: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
    },
  },
}));

const createCheckout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { workspaceId: 'workspace-1', planId: 'pro', interval: 'monthly' },
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({ role: 'OWNER' } as any);
  vi.mocked(getBillingConfig).mockReturnValue({
    providerName: 'dodo',
    environment: 'test_mode',
    apiKey: 'key',
    webhookSecret: 'secret',
    products: [{ planId: 'pro', interval: 'monthly', productId: 'pdt_pro' }],
  });
  vi.mocked(findBillingProduct).mockReturnValue({
    planId: 'pro',
    interval: 'monthly',
    productId: 'pdt_pro',
  });
  vi.mocked(getDodoBillingProvider).mockReturnValue({ createCheckout } as any);
  createCheckout.mockResolvedValue({ url: 'https://checkout.example.com', sessionId: 'cs_1' });
});

test('rejects a non-owner before contacting the provider', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await POST(
    new Request('https://app.example.com/api/billing/checkout', { method: 'POST' }),
  );

  expect(response.status).toBe(403);
  expect(createCheckout).not.toHaveBeenCalled();
});

test('returns a checkout URL without activating the plan', async () => {
  const client = (await import('@/lib/prisma')).default.client as any;

  client.platformSubscription.findUnique.mockResolvedValue(null);
  client.user.findUnique.mockResolvedValue({
    username: 'owner@example.com',
    displayName: 'Owner',
  });
  client.billingCustomer.findUnique.mockResolvedValue(null);

  const response = await POST(
    new Request('https://app.example.com/api/billing/checkout', { method: 'POST' }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.url).toBe('https://checkout.example.com');
  expect(createCheckout).toHaveBeenCalledWith(
    expect.objectContaining({
      workspaceId: 'workspace-1',
      planId: 'pro',
      interval: 'monthly',
      successUrl: 'https://app.example.com/app/settings/billing?checkout=success',
    }),
  );
  expect(recordAuditEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'billing.checkout.created' }),
  );
});
