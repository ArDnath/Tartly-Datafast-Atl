'use client';
import { WebsiteSettingsPage } from '@/features/websites/settings/WebsiteSettingsPage';

export function SettingsPage({ websiteId }: { websiteId: string }) {
  return <WebsiteSettingsPage websiteId={websiteId} />;
}
