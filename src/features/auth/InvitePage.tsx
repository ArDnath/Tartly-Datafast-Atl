'use client';

import { Column, Heading, Loading, Row, Text } from '@talivia/react-zen';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useApi } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { BRAND } from '@/lib/brand';

interface InvitationPreview {
  email: string;
  role: string;
  expiresAt: string;
  accepted: boolean;
  expired: boolean;
  workspace: { name: string; slug: string };
}

const buttonStyle = {
  background: 'var(--talivia-accent-background, #f2b4cb)',
  border: 0,
  borderRadius: 12,
  color: 'var(--talivia-accent-ink, #2b1622)',
  cursor: 'pointer',
  fontWeight: 600,
  minHeight: 44,
  padding: '0 18px',
  width: '100%',
} as const;

export function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { get, post } = useApi();
  const { user, isLoading: authLoading } = useLoginQuery();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const token = params?.token;

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    get(`/invitations/${token}`)
      .then(data => {
        if (!cancelled) setInvitation(data);
      })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Invitation not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [get, token]);

  async function handleAccept() {
    if (!token) return;

    setBusy(true);
    setError(null);

    try {
      await post(`/invitations/${token}/accept`);
      router.push('/app');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not accept the invitation.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column
      className="talivia-auth-shell"
      alignItems="center"
      justifyContent="flex-start"
      height="100vh"
      backgroundColor="surface-raised"
      style={{ paddingTop: '15vh' }}
    >
      <Column className="talivia-auth-form" alignItems="center" gap="5">
        <BrandMark size={40} />
        <Heading>Join {invitation?.workspace.name || 'workspace'}</Heading>
        {error && <Text style={{ color: '#f87171', textAlign: 'center' }}>{error}</Text>}
        {invitation ? (
          invitation.accepted ? (
            <Text color="muted">This invitation has already been accepted.</Text>
          ) : invitation.expired ? (
            <Text color="muted">This invitation has expired. Ask for a new one.</Text>
          ) : !user ? (
            <>
              <Text color="muted" style={{ textAlign: 'center' }}>
                Sign in as {invitation.email} to join as {invitation.role.toLowerCase()}.
              </Text>
              <Link
                href={`/login?returnUrl=${encodeURIComponent(`/invite/${token}`)}`}
                style={{ width: '100%' }}
              >
                <button type="button" style={buttonStyle}>
                  Sign in to accept
                </button>
              </Link>
            </>
          ) : (
            <>
              <Text color="muted" style={{ textAlign: 'center' }}>
                You are joining {invitation.workspace.name} as {invitation.role.toLowerCase()}.
              </Text>
              <button type="button" style={buttonStyle} disabled={busy} onClick={handleAccept}>
                {busy ? 'Joining…' : `Join ${BRAND.name}`}
              </button>
            </>
          )
        ) : (
          <Row>
            <Text color="muted">This invitation is not valid.</Text>
          </Row>
        )}
        <Text color="muted" size="sm">
          <Link href="/app">Back to {BRAND.name}</Link>
        </Text>
      </Column>
    </Column>
  );
}
