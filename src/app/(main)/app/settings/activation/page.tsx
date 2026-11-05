import type { Metadata } from 'next';
import { ActivationSettingsPage } from '@/features/account/settings/ActivationSettingsPage';

export default function () {
  return <ActivationSettingsPage />;
}

export const metadata: Metadata = {
  title: 'Activation',
  robots: {
    index: false,
    follow: false,
  },
};
