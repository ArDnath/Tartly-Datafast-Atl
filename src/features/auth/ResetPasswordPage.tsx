'use client';

import {
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Icon,
  Text,
  TextField,
} from '@talivia/react-zen';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useMessages, useUpdateQuery } from '@/components/hooks';

export function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { labels, t, getErrorMessage } = useMessages();
  const { mutateAsync, error: submitError, isPending } = useUpdateQuery('/auth/password/reset');
  const [done, setDone] = useState(false);

  const handleSubmit = async (data: { password: string; confirmPassword: string }) => {
    try {
      await mutateAsync({ token, password: data.password });
      setDone(true);
    } catch {
      // The mutation error is rendered below.
    }
  };

  return (
    <Column
      className="talivia-auth-shell"
      alignItems="center"
      justifyContent="flex-start"
      height="100vh"
      backgroundColor="surface-raised"
      style={{ paddingTop: '15vh' }}
    >
      <Column className="talivia-auth-form" justifyContent="center" alignItems="center" gap="5">
        <Icon size="lg">
          <BrandMark size={40} />
        </Icon>
        <Heading>{done ? 'Password updated' : 'Choose a new password'}</Heading>

        {!token && !done ? (
          <Text color="muted" style={{ textAlign: 'center' }}>
            This link is missing its token. Request a new reset link.
          </Text>
        ) : done ? (
          <Text color="muted" style={{ textAlign: 'center' }}>
            All existing sessions were signed out. Use your new password to sign in.
          </Text>
        ) : (
          <Form
            className="talivia-auth-email-form"
            onSubmit={handleSubmit}
            error={getErrorMessage(submitError)}
          >
            <FormField
              name="password"
              rules={{
                required: t(labels.required),
                minLength: { value: 8, message: 'Use at least 8 characters' },
                maxLength: 72,
              }}
            >
              <TextField
                aria-label="New password"
                autoComplete="new-password"
                placeholder="New password (8+ characters)"
                type="password"
              />
            </FormField>
            <FormField
              name="confirmPassword"
              rules={{
                required: t(labels.required),
                validate: (value: string, values: Record<string, unknown>) =>
                  value === values.password || 'Passwords do not match',
              }}
            >
              <TextField
                aria-label="Confirm new password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                type="password"
              />
            </FormField>
            <FormButtons>
              <FormSubmitButton variant="primary" isDisabled={isPending}>
                Update password
              </FormSubmitButton>
            </FormButtons>
          </Form>
        )}

        <Text color="muted">
          <Link href={done ? '/login' : '/forgot-password'}>
            {done ? 'Sign in' : 'Request a new link'}
          </Link>
        </Text>
      </Column>
    </Column>
  );
}
