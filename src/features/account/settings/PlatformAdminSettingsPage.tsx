'use client';

import { Button, Column, Heading, Row, Text, TextField, useToast } from '@talivia/react-zen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';

interface AdminUser {
  id: string;
  username: string;
  displayName?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  suspendedAt: string | null;
  suspensionReason?: string | null;
}

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  planId: string;
  createdAt: string;
  deletedAt?: string | null;
  suspendedAt: string | null;
  suspensionReason?: string | null;
  ownerUsername: string | null;
}

interface AdminAccountsResponse {
  query: string;
  users: AdminUser[];
  workspaces: AdminWorkspace[];
}

const CARD_STYLE = {
  background: 'var(--talivia-card-background)',
  borderColor: 'var(--talivia-card-border)',
  borderRadius: 20,
} as const;

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

function SuspensionRow({
  target,
  id,
  label,
  detail,
  suspendedAt,
  reason,
  onDone,
}: {
  target: 'users' | 'workspaces';
  id: string;
  label: string;
  detail: string;
  suspendedAt: string | null;
  reason?: string | null;
  onDone: () => Promise<void>;
}) {
  const { post } = useApi();
  const { toast } = useToast();
  const [draftReason, setDraftReason] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);

    try {
      await post(`/admin/${target}/${id}/suspension`, {
        suspended: !suspendedAt,
        reason: !suspendedAt ? draftReason.trim() || undefined : undefined,
      });
      toast(suspendedAt ? 'Access restored.' : 'Account suspended.');
      setDraftReason('');
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Column gap="2" paddingY="3" style={{ borderBottom: '1px solid var(--talivia-card-border)' }}>
      <Row justifyContent="space-between" gap="3" wrap="wrap" alignItems="baseline">
        <Column gap="1" minWidth="0">
          <Text weight="bold">{label}</Text>
          <Text size="sm" color="muted">
            {detail}
          </Text>
        </Column>
        <Text size="sm" color="muted">
          {suspendedAt ? `Suspended ${formatDate(suspendedAt)}` : 'Active'}
        </Text>
      </Row>

      {suspendedAt && reason && (
        <Text size="sm" color="muted">
          Reason: {reason}
        </Text>
      )}

      {!suspendedAt && (
        <Row gap="2" alignItems="center" wrap="wrap">
          <TextField
            value={draftReason}
            onChange={setDraftReason}
            placeholder="Optional reason (max 500)"
            aria-label={`Suspension reason for ${label}`}
          />
          <Button variant="danger" isDisabled={busy} onPress={toggle}>
            {busy ? 'Working…' : 'Suspend'}
          </Button>
        </Row>
      )}

      {suspendedAt && (
        <Row>
          <Button isDisabled={busy} onPress={toggle}>
            {busy ? 'Working…' : 'Restore access'}
          </Button>
        </Row>
      )}
    </Column>
  );
}

/**
 * Platform-operator console. It is reachable only for users matched by the
 * server-side `PLATFORM_ADMIN_EMAILS` allowlist; workspace ownership is not a
 * platform grant. The API re-checks the same flag on every call.
 */
export function PlatformAdminSettingsPage() {
  const { get } = useApi();
  const { user } = useLoginQuery();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['platform-admin-accounts', submitted],
    queryFn: () =>
      get(
        `/admin/accounts?query=${encodeURIComponent(submitted)}`,
      ) as Promise<AdminAccountsResponse>,
    enabled: Boolean(user?.isPlatformAdmin) && submitted.length >= 2,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform-admin-accounts'] });
  };

  if (!user?.isPlatformAdmin) {
    return (
      <SettingsPageLayout
        activeKey="admin"
        subtitle="Platform operations. This page is restricted to the platform allowlist."
      >
        <Text color="muted">
          This page is only available to platform operators. Workspace ownership does not grant
          access.
        </Text>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      activeKey="admin"
      subtitle="Suspend abusive accounts without deleting data. Every action is written to the audit log."
    >
      <Column gap="5">
        <Column gap="1">
          <Heading size="lg">Abuse controls</Heading>
          <Text color="muted">
            Search an exact email or workspace name. Suspension revokes live sessions immediately
            and blocks sign-in; it does not delete events, invoices, or audit history. Reason text
            is shown to the operator only.
          </Text>
        </Column>

        <Row gap="2" alignItems="center" wrap="wrap">
          <TextField
            value={query}
            onChange={setQuery}
            placeholder="Email or workspace name (min 2 characters)"
            aria-label="Search accounts"
          />
          <Button isDisabled={query.trim().length < 2} onPress={() => setSubmitted(query.trim())}>
            Search
          </Button>
        </Row>

        {accountsQuery.isLoading && <Text color="muted">Searching…</Text>}

        {accountsQuery.error && (
          <Text color="muted">
            {accountsQuery.error instanceof Error
              ? accountsQuery.error.message
              : 'Could not search accounts.'}
          </Text>
        )}

        {submitted.length >= 2 && accountsQuery.data && (
          <>
            <Column border padding="4" gap="2" style={CARD_STYLE}>
              <Heading size="lg">Users ({accountsQuery.data.users.length})</Heading>
              {accountsQuery.data.users.length === 0 && (
                <Text color="muted">No matching users.</Text>
              )}
              {accountsQuery.data.users.map(item => (
                <SuspensionRow
                  key={item.id}
                  target="users"
                  id={item.id}
                  label={item.username}
                  detail={`User ID ${item.id} · created ${formatDate(item.createdAt)}${
                    item.deletedAt ? ' · deleted' : ''
                  }`}
                  suspendedAt={item.suspendedAt}
                  reason={item.suspensionReason}
                  onDone={refresh}
                />
              ))}
            </Column>

            <Column border padding="4" gap="2" style={CARD_STYLE}>
              <Heading size="lg">Workspaces ({accountsQuery.data.workspaces.length})</Heading>
              {accountsQuery.data.workspaces.length === 0 && (
                <Text color="muted">No matching workspaces.</Text>
              )}
              {accountsQuery.data.workspaces.map(item => (
                <SuspensionRow
                  key={item.id}
                  target="workspaces"
                  id={item.id}
                  label={`${item.name} (${item.slug})`}
                  detail={`${item.planId} · owner ${item.ownerUsername ?? 'unknown'} · created ${formatDate(
                    item.createdAt,
                  )}${item.deletedAt ? ' · deleted' : ''}`}
                  suspendedAt={item.suspendedAt}
                  reason={item.suspensionReason}
                  onDone={refresh}
                />
              ))}
            </Column>
          </>
        )}
      </Column>
    </SettingsPageLayout>
  );
}
