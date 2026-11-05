import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { SettingsLayout } from '@/features/settings/SettingsLayout';

export default function ({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}

export const metadata: Metadata = {
  title: {
    template: `%s | Settings | ${BRAND.name}`,
    default: `Settings | ${BRAND.name}`,
  },
};
