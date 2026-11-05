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
import { useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { BRAND } from '@/lib/brand';

export function ForgotPasswordPage() {
  const { labels, t, getErrorMessage } = useMessages();
  const { mutateAsync, error: submitError, isPending } = useUpdateQuery('/auth/password/forgot');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (data: { email: string }) => {
    try {
      await mutateAsync({ email: data.email.trim().toLowerCase() });
      setSent(true);
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
        <Heading>Reset your password</Heading>
        <Text color="muted" style={{ textAlign: 'center' }}>
          {sent
            ? `If an account exists for that address, a reset link is on its way. The link expires in one hour.`
            : `Enter the email you use for ${BRAND.name} and we will send a single-use reset link.`}
        </Text>

        {sent ? (
          <Text color="muted">
            <Link href="/login">Back to sign in</Link>
          </Text>
        ) : (
          <>
            <Form
              className="talivia-auth-email-form"
              onSubmit={handleSubmit}
              error={getErrorMessage(submitError)}
            >
              <FormField
                name="email"
                rules={{
                  required: t(labels.required),
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
                }}
              >
                <TextField
                  aria-label="Email"
                  autoComplete="email"
                  placeholder="Email"
                  type="email"
                />
              </FormField>
              <FormButtons>
                <FormSubmitButton variant="primary" isDisabled={isPending}>
                  Send reset link
                </FormSubmitButton>
              </FormButtons>
            </Form>
            <Text color="muted">
              <Link href="/login">Back to sign in</Link>
            </Text>
          </>
        )}
      </Column>
    </Column>
  );
}
