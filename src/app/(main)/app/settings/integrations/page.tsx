import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { IntegrationsSettingsPage } from '@/features/payments/settings/IntegrationsSettingsPage';

export default function () {
  return (
    <SettingsPageLayout
      activeKey="integrations"
      subtitle="Payment providers connected for revenue attribution"
    >
      <IntegrationsSettingsPage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Integrations',
};
