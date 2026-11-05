import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { UsageSettingsPage } from '@/features/settings/billing/UsageSettingsPage';

export default function () {
  return (
    <SettingsPageLayout activeKey="billing" subtitle="Plan, allowances, and this month's usage">
      <UsageSettingsPage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Plan and usage',
};
