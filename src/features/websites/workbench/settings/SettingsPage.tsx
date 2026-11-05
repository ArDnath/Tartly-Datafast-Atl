'use client';
import { WebsiteSettingsPage } from '@/features/settings/websites/[websiteId]/WebsiteSettingsPage';

export function SettingsPage({ websiteId }: { websiteId: string }) {
  return <WebsiteSettingsPage websiteId={websiteId} />;
}
