import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { SettingsHomePage } from '@/features/settings/SettingsHomePage';

export default function () {
  return (
    <SettingsPageLayout activeKey="overview" subtitle="Workspace, sites, integrations, and account">
      <SettingsHomePage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Settings',
};
