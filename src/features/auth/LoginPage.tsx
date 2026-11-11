'use client';
import { Column, Loading } from '@talivia/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { APP_SECRET_CONFIGURATION_ERROR_CODE } from '@/lib/app-config';
import { sanitizeAuthReturnUrl } from '@/features/auth/lib/auth-return-url';
import type { ApiError } from '@/lib/types';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const { user, isLoading, error } = useLoginQuery();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReturnUrl = searchParams.get('returnUrl');
  const returnUrl = sanitizeAuthReturnUrl(requestedReturnUrl);
  const configurationError =
    (error as ApiError)?.code === APP_SECRET_CONFIGURATION_ERROR_CODE ? error : undefined;

  useEffect(() => {
    if (user) {
      const destination =
        user.onboardingRequired && !returnUrl.startsWith('/onboarding') ? '/onboarding' : returnUrl;

      router.replace(destination);
    }
  }, [user, router, returnUrl]);

  if (isLoading || user) {
    return (
      <>
        <ThemeToggle floating />
        <Loading placement="absolute" />
      </>
    );
  }

  return (
    <Column
      className="talivia-auth-shell talivia-auth-centered"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      backgroundColor="surface-raised"
    >
      <ThemeToggle floating />
      <LoginForm
        returnUrl={returnUrl}
        initialError={configurationError}
        errorCode={searchParams.get('error')}
      />
    </Column>
  );
}
