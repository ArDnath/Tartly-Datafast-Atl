'use client';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { useMessages } from '@/components/hooks';
import { PreferenceSettings } from './PreferenceSettings';

export function PreferencesPage() {
  const { t, labels } = useMessages();

  return (
    <SettingsPageLayout activeKey="preferences" subtitle={t(labels.preferences)}>
      <PreferenceSettings />
    </SettingsPageLayout>
  );
}
