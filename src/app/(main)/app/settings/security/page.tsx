import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { SecuritySettingsPage } from '@/features/account/settings/SecuritySettingsPage';

export default function () {
  return (
    <SettingsPageLayout activeKey="security" subtitle="Sign-in, email verification, and account deletion">
      <SecuritySettingsPage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Security',
};
