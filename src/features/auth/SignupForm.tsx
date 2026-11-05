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
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand/BrandMark';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { BRAND } from '@/lib/brand';

export function SignupForm() {
  const router = useRouter();
  const { labels, t, getErrorMessage } = useMessages();
  const { mutateAsync, error: submitError, isPending } = useUpdateQuery('/auth/register');

  const handleSubmit = async (data: {
    username: string;
    password: string;
    confirmPassword: string;
    workspaceName?: string;
  }) => {
    try {
      await mutateAsync({
        username: data.username.trim().toLowerCase(),
        password: data.password,
        workspaceName: data.workspaceName?.trim() || undefined,
      });
    } catch {
      return;
    }

    router.push('/onboarding');
  };

  return (
    <Column className="talivia-auth-form" justifyContent="center" alignItems="center" gap="5">
      <Icon size="lg">
        <BrandMark size={40} />
      </Icon>
      <Heading>Create your account</Heading>
      <Text color="muted" style={{ textAlign: 'center', maxWidth: 320 }}>
        {BRAND.promise}
      </Text>
      <Form
        className="talivia-auth-email-form"
        onSubmit={handleSubmit}
        error={getErrorMessage(submitError)}
      >
        <FormField
          name="username"
          rules={{
            required: t(labels.required),
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
          }}
        >
          <TextField aria-label="Email" autoComplete="email" placeholder="Email" type="email" />
        </FormField>
        <FormField name="workspaceName" rules={{ maxLength: 100 }}>
          <TextField
            aria-label="Workspace name"
            autoComplete="organization"
            placeholder="Workspace name (optional)"
          />
        </FormField>
        <FormField
          name="password"
          rules={{
            required: t(labels.required),
            minLength: { value: 8, message: 'Use at least 8 characters' },
            maxLength: 72,
          }}
        >
          <TextField
            aria-label="Password"
            autoComplete="new-password"
            placeholder="Password (8+ characters)"
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
            aria-label="Confirm password"
            autoComplete="new-password"
            placeholder="Confirm password"
            type="password"
          />
        </FormField>
        <FormButtons>
          <FormSubmitButton data-test="button-submit" variant="primary" isDisabled={isPending}>
            Create account
          </FormSubmitButton>
        </FormButtons>
      </Form>
      <Text color="muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </Text>
    </Column>
  );
}
