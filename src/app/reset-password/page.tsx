import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

export default function () {
  return <ResetPasswordPage />;
}

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};
