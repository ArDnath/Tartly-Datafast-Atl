'use client';

import { Column, Heading, Text } from '@talivia/react-zen';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';

interface AuditRow {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  userId: string | null;
  websiteId: string | null;
  createdAt: string;
}

interface AuditResponse {
  data: AuditRow[];
  pagination: { limit: number; has_more: boolean };
}

const CARD_STYLE = {
  background: 'var(--talivia-card-background)',
  borderColor: 'var(--talivia-card-border)',
  borderRadius: 20,
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/**
 * Platform-operator audit list. The API omits IP, user agent, and metadata;
 * this screen shows the durable action trail without leaking request details.
 */
export function AuditSettingsPage() {
  const { get } = useApi();
  const { user } = useLoginQuery();
  const auditQuery = useQuery({
    queryKey: ['platform-audit'],
    queryFn: () => get('/admin/audit?limit=100') as Promise<AuditResponse>,
    enabled: Boolean(user?.isPlatformAdmin),
    refetchOnWindowFocus: true,
  });

  if (!user?.isPlatformAdmin) {
    return (
      <SettingsPageLayout
        activeKey="audit"
        subtitle="Audit trail for platform operators. Workspace ownership does not grant access."
      >
        <Text color="muted">This page is only available to platform operators.</Text>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      activeKey="audit"
      subtitle="Durable audit trail for billing, membership, keys, deletion, and suspension actions."
    >
      <Column gap="5">
        <Column gap="1">
          <Heading size="lg">Audit trail</Heading>
          <Text color="muted">
            Newest first. IP addresses, user agents, and metadata are omitted from this list; use
            the audit row ID for a separate investigation if needed.
          </Text>
        </Column>

        {auditQuery.isLoading && <Text color="muted">Loading audit events…</Text>}
        {auditQuery.error && (
          <Text color="muted">
            {auditQuery.error instanceof Error
              ? auditQuery.error.message
              : 'Could not load audit events.'}
          </Text>
        )}

        {auditQuery.data && (
          <Column border padding="4" gap="2" style={CARD_STYLE}>
            {auditQuery.data.data.length === 0 && (
              <Text color="muted">No audit events have been recorded yet.</Text>
            )}
            {auditQuery.data.data.map(row => (
              <Column
                key={row.id}
                gap="1"
                paddingY="3"
                style={{ borderBottom: '1px solid #ffffff0d' }}
              >
                <Text weight="bold">{row.eventType}</Text>
                <Text size="sm" color="muted">
                  {row.resourceType ?? 'resource'} {row.resourceId ?? '—'} ·{' '}
                  {formatDate(row.createdAt)}
                </Text>
                <Text size="sm" color="muted">
                  actor {row.userId ?? 'system'}
                  {row.websiteId ? ` · website ${row.websiteId}` : ''}
                </Text>
              </Column>
            ))}
          </Column>
        )}
      </Column>
    </SettingsPageLayout>
  );
}
