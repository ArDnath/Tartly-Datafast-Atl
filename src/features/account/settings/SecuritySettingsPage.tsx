'use client';

import {
  Button,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Row,
  Text,
  TextField,
  useToast,
} from '@talivia/react-zen';
import { useState } from 'react';
import { useApi, useMessages } from '@/components/hooks';
import { DialogButton } from '@/components/input/DialogButton';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { PasswordChangeForm } from '@/features/account/settings/PasswordChangeForm';

const CARD_STYLE = {
  background: '#161616',
  borderColor: '#ffffff12',
  borderRadius: 20,
} as const;

function formatDate(value?: Date | string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? '—'
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

function AccountDeletionForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { getErrorMessage } = useMessages();
  const [error, setError] = useState<Error | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (data: { password: string; confirmation: string }) => {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch('/api/me/account', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || 'Could not delete this account.');
      }

      toast('Account deleted. Owned workspaces were soft-deleted and sessions were revoked.');
      window.location.href = '/login';
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Could not delete this account.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} error={getErrorMessage(error)}>
      <Text color="muted">
        This soft-deletes every workspace you own, revokes all sessions, and anonymises the account
        row. Analytics data is left for the tenant-scoped retention job; it is not silently
        hard-deleted from this dialog.
      </Text>
      <FormField
        name="password"
        label="Current password"
        rules={{ required: 'Enter your current password.' }}
      >
        <TextField type="password" autoComplete="current-password" aria-label="Current password" />
      </FormField>
      <FormField
        name="confirmation"
        label="Type DELETE to confirm"
        rules={{
          validate: value => value === 'DELETE' || 'Type DELETE exactly to confirm.',
        }}
      >
        <TextField autoComplete="off" aria-label="Type DELETE to confirm" />
      </FormField>
      <FormButtons>
        <Button onPress={onClose}>Cancel</Button>
        <FormSubmitButton variant="danger" isDisabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete account'}
        </FormSubmitButton>
      </FormButtons>
    </Form>
  );
}

export function SecuritySettingsPage() {
  const { user } = useLoginQuery();
  const { post } = useApi();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const resendVerification = async () => {
    setIsSending(true);
    setVerificationMessage(null);

    try {
      const result = (await post('/auth/email/resend')) as {
        sent: boolean;
        alreadyVerified?: boolean;
      };

      if (result.alreadyVerified) {
        setVerificationMessage('This email address is already verified.');
      } else {
        setVerificationMessage('Verification email sent. Check your inbox for the link.');
        toast('Verification email sent.');
      }
    } catch (cause) {
      setVerificationMessage(
        cause instanceof Error ? cause.message : 'Could not send a verification email.',
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Column gap="5">
      <Column gap="1">
        <Heading size="lg">Security</Heading>
        <Text color="muted">
          Sign-in, email verification, and account lifecycle. Tenant access is re-checked on every
          request, not inferred from this page.
        </Text>
      </Column>

      <Column border padding="4" gap="3" style={CARD_STYLE}>
        <Heading size="lg">Sign-in</Heading>
        <Row justifyContent="space-between" gap="3" wrap="wrap">
          <Text color="muted">Username</Text>
          <Text>{user.username}</Text>
        </Row>
        <Row justifyContent="space-between" gap="3" wrap="wrap">
          <Text color="muted">Role</Text>
          <Text>{user.role}</Text>
        </Row>
        <Row justifyContent="space-between" gap="3" wrap="wrap">
          <Text color="muted">Account created</Text>
          <Text>{formatDate(user.createdAt)}</Text>
        </Row>
        <Text size="sm" color="muted">
          Browsers use an HttpOnly, SameSite=Lax session cookie. The raw session token is never
          returned in a response body. API integrations use API keys instead.
        </Text>
      </Column>

      <Column border padding="4" gap="3" style={CARD_STYLE}>
        <Heading size="lg">Email verification</Heading>
        <Row justifyContent="space-between" gap="3" wrap="wrap">
          <Text color="muted">Status</Text>
          <Text style={{ color: user.emailVerifiedAt ? '#2dbf72' : '#f8b84e' }}>
            {user.emailVerifiedAt ? 'Verified' : 'Not verified'}
          </Text>
        </Row>
        {!user.emailVerifiedAt && (
          <Row gap="3" alignItems="center" wrap="wrap">
            <Button onPress={resendVerification} isDisabled={isSending}>
              {isSending ? 'Sending…' : 'Send verification email'}
            </Button>
            {verificationMessage && (
              <Text size="sm" color="muted">
                {verificationMessage}
              </Text>
            )}
          </Row>
        )}
        {verificationMessage && user.emailVerifiedAt && (
          <Text size="sm" color="muted">
            {verificationMessage}
          </Text>
        )}
      </Column>

      <Column border padding="4" gap="3" style={CARD_STYLE}>
        <Heading size="lg">Change password</Heading>
        <Text size="sm" color="muted">
          Changing the password revokes every active session, including this one. You will be signed
          out and asked to sign in again.
        </Text>
        <PasswordChangeForm />
      </Column>

      <Column
        border
        padding="4"
        gap="3"
        style={{ ...CARD_STYLE, borderColor: 'rgba(255, 179, 179, 0.34)' }}
      >
        <Heading size="lg">Delete account</Heading>
        <Text size="sm" color="muted">
          Account deletion is permanent from a product-access point of view. It removes access to
          every owned workspace and anonymises the account. Download any data you need first.
        </Text>
        <DialogButton label="Delete account" title="Delete account" variant="danger" width="520px">
          {({ close }) => <AccountDeletionForm onClose={close} />}
        </DialogButton>
      </Column>
    </Column>
  );
}
