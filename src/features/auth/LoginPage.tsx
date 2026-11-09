'use client';
import { Column, Loading } from '@talivia/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
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
      router.replace(returnUrl);
    }
  }, [user, router, returnUrl]);

  if (isLoading || user) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column
      className="talivia-auth-shell talivia-auth-centered"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      backgroundColor="surface-raised"
    >
      <LoginForm
        returnUrl={returnUrl}
        initialError={configurationError}
        errorCode={searchParams.get('error')}
      />
    </Column>
  );
}
