import type { Metadata } from 'next';
import { LoginPage } from '@/features/auth/LoginPage';

export default function () {
  return <LoginPage />;
}

export const metadata: Metadata = {
  title: 'Login',
  robots: {
    index: false,
    follow: false,
  },
};
