import type { Metadata } from 'next';
import { ProfilePage } from '@/features/settings/account/ProfilePage';

export default function () {
  return <ProfilePage />;
}

export const metadata: Metadata = {
  title: 'Account',
};
