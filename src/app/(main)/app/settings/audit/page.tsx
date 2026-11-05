import type { Metadata } from 'next';
import { AuditSettingsPage } from '@/features/account/settings/AuditSettingsPage';

export default function () {
  return <AuditSettingsPage />;
}

export const metadata: Metadata = {
  title: 'Audit trail',
  robots: {
    index: false,
    follow: false,
  },
};
