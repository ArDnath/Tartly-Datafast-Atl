import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { requireWorkspaceAccess } from '@/lib/workspace-auth';
import { recordAuditEvent } from '@/queries/prisma';
import { POST } from './handler';

const OnboardingError = vi.hoisted(
  () =>
    class OnboardingError extends Error {
      constructor(
        readonly code: string,
        message: string,
        readonly status = 400,
      ) {
        super(message);
      }
    },
);

const onboarding = vi.hoisted(() => ({
  ensureOnboardingWorkspace: vi.fn(),
  createOnboardingWebsite: vi.fn(),
}));

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/workspace-auth', () => ({ requireWorkspaceAccess: vi.fn() }));
vi.mock('@/queries/prisma', () => ({ recordAuditEvent: vi.fn() }));
vi.mock('../queries/onboarding', () => ({
  OnboardingError,
  ensureOnboardingWorkspace: onboarding.ensureOnboardingWorkspace,
  createOnboardingWebsite: onboarding.createOnboardingWebsite,
}));

const workspace = {
  id: 'workspace-1',
  name: 'Acme',
  slug: 'acme-user1',
  ownerId: 'user-1',
  planId: 'starter',
  subscriptionStatus: 'incomplete',
  onboardingCompletedAt: null,
};

const website = {
  id: 'website-1',
  name: 'acme.com',
  domain: 'acme.com',
  workspaceId: 'workspace-1',
};

function request() {
  return new Request('https://app.example.com/api/onboarding/website', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { domain: 'https://acme.com/pricing' },
    query: {},
  } as any);
  vi.mocked(requireWorkspaceAccess).mockResolvedValue({
    workspaceId: workspace.id,
    role: 'OWNER',
    workspace,
  } as any);
  onboarding.ensureOnboardingWorkspace.mockResolvedValue({ workspace, created: true });
  onboarding.createOnboardingWebsite.mockResolvedValue(website);
});

test('rejects a value that is not a domain', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'user-1' } },
    body: { domain: 'localhost' },
    query: {},
  } as any);

  const response = await POST(request());

  expect(response.status).toBe(400);
  expect(onboarding.ensureOnboardingWorkspace).not.toHaveBeenCalled();
});

test('creates the invisible workspace and first website together', async () => {
  const response = await POST(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(onboarding.ensureOnboardingWorkspace).toHaveBeenCalledWith('user-1', 'acme.com');
  expect(onboarding.createOnboardingWebsite).toHaveBeenCalledWith(
    'workspace-1',
    'user-1',
    'acme.com',
  );
  expect(body.workspace.role).toBe('OWNER');
  expect(body.website.id).toBe('website-1');
  expect(recordAuditEvent).toHaveBeenCalledWith(
    expect.objectContaining({ eventType: 'workspace.created' }),
  );
});

test('does not duplicate the workspace audit event on a resumed flow', async () => {
  onboarding.ensureOnboardingWorkspace.mockResolvedValue({ workspace, created: false });

  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(recordAuditEvent).not.toHaveBeenCalled();
});

test('rejects an unauthorized workspace before creating a website', async () => {
  vi.mocked(requireWorkspaceAccess).mockResolvedValue(null);

  const response = await POST(request());

  expect(response.status).toBe(401);
  expect(onboarding.createOnboardingWebsite).not.toHaveBeenCalled();
});

test('returns a conflict when onboarding already finished', async () => {
  onboarding.ensureOnboardingWorkspace.mockRejectedValue(
    new OnboardingError('already-onboarded', 'Already set up.', 409),
  );

  const response = await POST(request());

  expect(response.status).toBe(409);
  expect((await response.json()).error.code).toBe('already-onboarded');
});

test('requires a signed-in user', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: {}, body: { domain: 'acme.com' } } as any);

  const response = await POST(request());

  expect(response.status).toBe(401);
});
