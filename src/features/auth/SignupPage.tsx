'use client';

import { Column, Loading } from '@talivia/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { sanitizeAuthReturnUrl } from '@/lib/auth-return-url';
import { SignupForm } from './SignupForm';

export function SignupPage() {
  const { user, isLoading } = useLoginQuery();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = sanitizeAuthReturnUrl(searchParams.get('returnUrl'));

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
      className="talivia-auth-shell"
      alignItems="center"
      justifyContent="flex-start"
      height="100vh"
      backgroundColor="surface-raised"
      style={{ paddingTop: '10vh' }}
    >
      <SignupForm />
    </Column>
  );
}
