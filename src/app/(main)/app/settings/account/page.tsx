import type { Metadata } from 'next';
import { ProfilePage } from '@/features/settings/profile/ProfilePage';

export default function () {
  return <ProfilePage />;
}

export const metadata: Metadata = {
  title: 'Account',
};
