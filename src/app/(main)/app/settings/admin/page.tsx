import type { Metadata } from 'next';
import { PlatformAdminSettingsPage } from '@/features/account/settings/PlatformAdminSettingsPage';

export default function () {
  return <PlatformAdminSettingsPage />;
}

export const metadata: Metadata = {
  title: 'Platform operations',
  robots: {
    index: false,
    follow: false,
  },
};
