import type { Metadata } from 'next';
import { LogoutPage } from '@/features/auth/LogoutPage';

export default function () {
  return <LogoutPage />;
}

export const metadata: Metadata = {
  title: 'Logout',
  robots: {
    index: false,
    follow: false,
  },
};
