'use client';

import {
  Button,
  Column,
  Form,
  FormField,
  FormSubmitButton,
  Heading,
  Row,
  Text,
  TextField,
} from '@talivia/react-zen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Panel } from '@/components/common/Panel';
import { useActiveWorkspace, useApi } from '@/components/hooks';
import { getPlanOrNull } from '@/lib/plans';

interface Member {
  id: string;
  role: string;
  userId: string;
  user: { id: string; username: string; displayName?: string | null };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const CARD_STYLE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

export function WorkspaceSettingsPage() {
  const { get, post, del } = useApi();
  const queryClient = useQueryClient();
  const { workspaceId, activeWorkspace, isLoading: workspaceLoading } = useActiveWorkspace();
  const [role, setRole] = useState('MEMBER');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/members`) as Promise<Member[]>,
    enabled: Boolean(workspaceId),
  });

  const invitationsQuery = useQuery({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: () => get(`/workspaces/${workspaceId}/invitations`) as Promise<Invitation[]>,
    enabled: Boolean(workspaceId),
  });

  if (workspaceLoading) {
    return <Text color="muted">Loading workspace…</Text>;
  }

  if (!workspaceId || !activeWorkspace) {
    return (
      <Column gap="3">
        <Heading size="lg">Workspace</Heading>
        <Text color="muted">Create or select a workspace to manage members and invitations.</Text>
      </Column>
    );
  }

  const plan = getPlanOrNull(activeWorkspace.planId);

  const handleInvite = async (data: { email: string }) => {
    setBusy(true);
    setMessage(null);

    try {
      const invitation = (await post(`/workspaces/${workspaceId}/invitations`, {
        email: data.email,
        role,
      })) as Invitation & { emailDelivered: boolean };

      setMessage(
        invitation.emailDelivered
          ? `Invitation sent to ${invitation.email}.`
          : `Invitation created for ${invitation.email}, but email delivery is not configured. In development, open .dev-emails/outbox.log for the link.`,
      );
      await invitationsQuery.refetch();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not create the invitation.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    await del(`/workspaces/${workspaceId}/invitations/${invitationId}`);
    await invitationsQuery.refetch();
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await del(`/workspaces/${workspaceId}/members/${memberId}`);
      await queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      setMessage('Member removed.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not remove the member.');
    }
  };

  return (
    <Column gap="5">
      <Column gap="1">
        <Heading size="lg">{activeWorkspace.name}</Heading>
        <Text color="muted">
          {plan ? `${plan.name} plan · ${plan.websiteLimit} website${plan.websiteLimit === 1 ? '' : 's'} · ${plan.memberLimit} member${plan.memberLimit === 1 ? '' : 's'}` : 'No plan selected'}
          {' · '}
          {activeWorkspace.subscriptionStatus}
        </Text>
      </Column>

      <Panel style={CARD_STYLE}>
        <Column gap="3" padding="4">
          <Heading size="lg">Members</Heading>
          {membersQuery.isLoading && <Text color="muted">Loading members…</Text>}
          {membersQuery.data?.map(member => (
            <Row key={member.id} justifyContent="space-between" alignItems="center" gap="3">
              <Column gap="0">
                <Text>{member.user.displayName || member.user.username}</Text>
                <Text size="sm" color="muted">
                  {member.role.toLowerCase()}
                </Text>
              </Column>
              {member.role !== 'OWNER' && (
                <Button size="sm" onPress={() => handleRemoveMember(member.id)}>
                  Remove
                </Button>
              )}
            </Row>
          ))}
        </Column>
      </Panel>

      <Panel style={CARD_STYLE}>
        <Column gap="3" padding="4">
          <Heading size="lg">Invite a member</Heading>
          <Form onSubmit={handleInvite} error={message || undefined}>
            <FormField name="email" rules={{ required: 'Email is required' }}>
              <TextField aria-label="Email" placeholder="teammate@example.com" type="email" />
            </FormField>
            <Row gap="2" alignItems="center" paddingY="2">
              <Text size="sm" color="muted">
                Role
              </Text>
              <select
                aria-label="Invitation role"
                value={role}
                onChange={event => setRole(event.target.value)}
                style={{
                  background: '#111',
                  border: '1px solid #ffffff20',
                  borderRadius: 10,
                  color: 'inherit',
                  minHeight: 40,
                  padding: '0 10px',
                }}
              >
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Row>
            <FormSubmitButton isDisabled={busy}>Send invitation</FormSubmitButton>
          </Form>
        </Column>
      </Panel>

      <Panel style={CARD_STYLE}>
        <Column gap="3" padding="4">
          <Heading size="lg">Pending invitations</Heading>
          {invitationsQuery.data?.length ? (
            invitationsQuery.data.map(invitation => (
              <Row key={invitation.id} justifyContent="space-between" alignItems="center" gap="3">
                <Column gap="0">
                  <Text>{invitation.email}</Text>
                  <Text size="sm" color="muted">
                    {invitation.role.toLowerCase()} · expires{' '}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </Text>
                </Column>
                <Button size="sm" onPress={() => handleRevoke(invitation.id)}>
                  Revoke
                </Button>
              </Row>
            ))
          ) : (
            <Text color="muted">No pending invitations.</Text>
          )}
        </Column>
      </Panel>
    </Column>
  );
}
