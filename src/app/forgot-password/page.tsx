import type { Metadata } from 'next';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';

export default function () {
  return <ForgotPasswordPage />;
}

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};
