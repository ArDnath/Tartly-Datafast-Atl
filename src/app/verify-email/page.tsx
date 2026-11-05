import type { Metadata } from 'next';
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';

export default function () {
  return <VerifyEmailPage />;
}

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false },
};
