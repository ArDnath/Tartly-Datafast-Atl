'use client';

import { Column, Heading, Icon, Loading, Text } from '@talivia/react-zen';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useApi } from '@/components/hooks';

type State = 'missing' | 'verifying' | 'verified' | 'invalid';

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { post } = useApi();
  const started = useRef(false);
  const [state, setState] = useState<State>(token ? 'verifying' : 'missing');

  useEffect(() => {
    if (!token || started.current) {
      return;
    }

    started.current = true;

    post('/auth/email/verify', { token })
      .then(() => setState('verified'))
      .catch(() => setState('invalid'));
  }, [token, post]);

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
        <Heading>
          {state === 'verified'
            ? 'Email verified'
            : state === 'invalid'
              ? 'Link expired'
              : 'Verifying your email'}
        </Heading>

        {state === 'verifying' ? <Loading placement="inline" /> : null}

        <Text color="muted" style={{ textAlign: 'center' }}>
          {state === 'verified'
            ? 'Your email address is confirmed. You can close this page or continue to the dashboard.'
            : state === 'invalid'
              ? 'This verification link is invalid, expired, or already used. Sign in and request a new one.'
              : state === 'missing'
                ? 'This page needs a verification token. Open the link from your email.'
                : 'One moment.'}
        </Text>

        <Text color="muted">
          <Link href={state === 'verified' ? '/app' : '/login'}>
            {state === 'verified' ? 'Open dashboard' : 'Back to sign in'}
          </Link>
        </Text>
      </Column>
    </Column>
  );
}
