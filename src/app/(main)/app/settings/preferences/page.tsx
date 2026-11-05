import type { Metadata } from 'next';
import { PreferencesPage } from '@/features/account/settings/preferences/PreferencesPage';

export default function () {
  return <PreferencesPage />;
}

export const metadata: Metadata = {
  title: 'Preferences',
};
