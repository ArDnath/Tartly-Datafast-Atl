'use client';
import { WebsiteSettingsPage } from '@/features/websites/workbench/settings/WebsiteSettingsPage';

export function SettingsPage({ websiteId }: { websiteId: string }) {
  return <WebsiteSettingsPage websiteId={websiteId} />;
}
