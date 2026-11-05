import type { Metadata } from 'next';
import { ProfilePage } from '@/features/account/settings/ProfilePage';

export default function () {
  return <ProfilePage />;
}

export const metadata: Metadata = {
  title: 'Account',
};
