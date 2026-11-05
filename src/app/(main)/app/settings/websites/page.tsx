import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { WebsitesSettingsPage } from '@/features/websites/settings/WebsitesSettingsPage';

export default function () {
  return (
    <SettingsPageLayout activeKey="websites" subtitle="Sites in this workspace">
      <WebsitesSettingsPage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Websites',
};
