'use client';

import { Column, Heading, Row, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import Link from '@/components/common/Link';
import { useApi, useNavigation } from '@/components/hooks';
import { useWebsite } from '@/features/websites/hooks/useWebsite';

interface WorkspaceMember {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
  };
}

type WebsiteWithAccess = ReturnType<typeof useWebsite> & {
  workspaceId?: string | null;
  access?: {
    canManageMembers?: boolean;
  };
};

/**
 * Website access is workspace access. There is no per-website member list:
 * keeping one membership surface prevents an invite from appearing to grant
 * access that the authorization layer would never honor.
 */
export function WebsiteTeamSettings() {
  const website = useWebsite() as WebsiteWithAccess;
  const { get } = useApi();
  const { renderUrl } = useNavigation();
  const workspaceId = website?.workspaceId ?? null;
  const canManageMembers = Boolean(website?.access?.canManageMembers);

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/members`) as Promise<WorkspaceMember[]>,
    enabled: Boolean(workspaceId),
  });

  return (
    <Column gap="5">
      <Column gap="2">
        <Heading size="lg">Team</Heading>
        <Text color="muted">
          Members and roles are managed at the workspace level so access stays consistent across
          every website in the workspace.
        </Text>
      </Column>

      {!workspaceId && (
        <Text color="muted">This website is not linked to a workspace yet. Contact support.</Text>
      )}

      {workspaceId && isLoading && <Text color="muted">Loading members…</Text>}

      {workspaceId && error && (
        <Text color="muted">Could not load workspace members. Try again.</Text>
      )}

      {workspaceId && !isLoading && !error && (
        <Column gap="3">
          {members.length > 0 ? (
            members.map(member => (
              <Row key={member.id} justifyContent="space-between" alignItems="center" gap="3">
                <Column gap="0">
                  <Text>{member.user.displayName || member.user.username}</Text>
                  <Text size="sm" color="muted">
                    {member.role.toLowerCase()}
                  </Text>
                </Column>
                <Text size="sm" color="muted">
                  Active
                </Text>
              </Row>
            ))
          ) : (
            <Text color="muted">No workspace members found.</Text>
          )}
        </Column>
      )}

      {workspaceId && (
        <Link
          href={renderUrl('/app/settings/workspace', false)}
          style={{ color: 'var(--accent-text)', fontSize: 13, fontWeight: 600 }}
        >
          {canManageMembers ? 'Manage workspace members' : 'View workspace members'}
        </Link>
      )}
    </Column>
  );
}
