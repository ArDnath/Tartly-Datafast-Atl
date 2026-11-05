import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/features/settings/SettingsPageLayout';
import { WorkspaceSettingsPage } from '@/features/settings/workspace/WorkspaceSettingsPage';

export default function () {
  return (
    <SettingsPageLayout activeKey="workspace" subtitle="Plan, members, and invitations">
      <WorkspaceSettingsPage />
    </SettingsPageLayout>
  );
}

export const metadata: Metadata = {
  title: 'Workspace',
};
