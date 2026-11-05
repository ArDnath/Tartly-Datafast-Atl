import type { Metadata } from 'next';
import { PreferencesPage } from '@/features/settings/preferences/PreferencesPage';

export default function () {
  return <PreferencesPage />;
}

export const metadata: Metadata = {
  title: 'Preferences',
};
