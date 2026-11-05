'use client';

import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { useMessages } from '@/components/hooks';
import { ProfileSettings } from './ProfileSettings';

export function ProfilePage() {
  const { t, labels } = useMessages();

  return (
    <SettingsPageLayout activeKey="account" subtitle={t(labels.profile)}>
      <ProfileSettings />
    </SettingsPageLayout>
  );
}
