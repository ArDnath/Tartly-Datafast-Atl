import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/app/(main)/settings/SettingsPageLayout';
import { WebsitesSettingsPage } from '@/app/(main)/settings/websites/WebsitesSettingsPage';

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
