import type { Metadata } from 'next';
import { SettingsPageLayout } from '@/app/(main)/settings/SettingsPageLayout';
import { WorkspaceSettingsPage } from '@/app/(main)/settings/workspace/WorkspaceSettingsPage';

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
