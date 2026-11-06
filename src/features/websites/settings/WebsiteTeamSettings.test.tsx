import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/render';
import { WebsiteTeamSettings } from './WebsiteTeamSettings';

const state = vi.hoisted(() => ({
  get: vi.fn(),
  workspaceId: 'workspace-1' as string | null,
  canManageMembers: true,
  members: [
    {
      id: 'member-1',
      role: 'OWNER',
      userId: 'user-1',
      user: { id: 'user-1', username: 'ada', displayName: 'Ada Lovelace' },
    },
    {
      id: 'member-2',
      role: 'VIEWER',
      userId: 'user-2',
      user: { id: 'user-2', username: 'grace', displayName: null },
    },
  ],
}));

vi.mock('@/features/websites/hooks/useWebsite', () => ({
  useWebsite: () => ({
    workspaceId: state.workspaceId,
    access: { canManageMembers: state.canManageMembers },
  }),
}));

vi.mock('@/components/hooks', async () => {
  const actual = await vi.importActual<any>('@/components/hooks');

  return {
    ...actual,
    useApi: () => ({ get: state.get }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  state.workspaceId = 'workspace-1';
  state.canManageMembers = true;
  state.get.mockResolvedValue(state.members);
});

test('lists workspace members instead of a per-website member list', async () => {
  render(<WebsiteTeamSettings />, { route: '/app/website-id/settings' });

  await waitFor(() => expect(state.get).toHaveBeenCalledWith('/workspaces/workspace-1/members'));

  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  expect(screen.getByText('grace')).toBeInTheDocument();
  expect(screen.getByText('owner')).toBeInTheDocument();
  expect(screen.getByText('viewer')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Manage workspace members' })).toHaveAttribute(
    'href',
    '/app/settings/workspace',
  );
  expect(screen.queryByRole('button', { name: 'Add user' })).not.toBeInTheDocument();
});

test('shows a read-only workspace link when the user cannot manage members', async () => {
  state.canManageMembers = false;

  render(<WebsiteTeamSettings />, { route: '/app/website-id/settings' });

  expect(await screen.findByRole('link', { name: 'View workspace members' })).toHaveAttribute(
    'href',
    '/app/settings/workspace',
  );
});

test('does not call the workspace API for a website with no workspace', async () => {
  state.workspaceId = null;

  render(<WebsiteTeamSettings />, { route: '/app/website-id/settings' });

  expect(await screen.findByText(/not linked to a workspace/i)).toBeInTheDocument();
  expect(state.get).not.toHaveBeenCalled();
});
