'use client';

import { Column } from '@talivia/react-zen';
import { BrandWordmark } from '@/components/brand/BrandMark';
import { sanitizeAuthReturnUrl } from '@/features/auth/lib/auth-return-url';
import { BRAND } from '@/lib/brand';

interface LoginFormProps {
  returnUrl?: string;
  initialError?: unknown;
  errorCode?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'google-unavailable':
    'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment.',
  'access-denied': 'Google sign-in was cancelled.',
  'invalid-state': 'Your sign-in session expired. Try again.',
  'rate-limited': 'Too many sign-in attempts. Try again later.',
  'google-failed': 'Google sign-in failed. Try again.',
  'account-unavailable': 'This account is not available. Contact support.',
  'email-not-verified': 'Google has not verified this email address.',
};

function getInitialErrorMessage(error: unknown) {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Sign-in is temporarily unavailable.';
}

export function LoginForm({ returnUrl, initialError, errorCode }: LoginFormProps) {
  const safeReturnUrl = sanitizeAuthReturnUrl(returnUrl);
  const message = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES['google-failed'])
    : getInitialErrorMessage(initialError);

  return (
    <Column className="talivia-auth-form talivia-auth-panel" alignItems="center" gap="7">
      <BrandWordmark size={72} className="talivia-auth-lockup" />

      {message ? (
        <p className="talivia-auth-error" role="alert">
          {message}
        </p>
      ) : null}

      <a
        className="talivia-auth-google-button"
        data-brand={BRAND.name}
        data-test="button-google"
        href={`/api/auth/google?returnUrl=${encodeURIComponent(safeReturnUrl)}`}
      >
        <GoogleGlyph />
        <span>Continue with Google</span>
      </a>
    </Column>
  );
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
