import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { Suspense } from 'react';
import { App } from '@/features/app-shell/App';

export default function ({ children }) {
  return (
    <Suspense>
      <App>{children}</App>
    </Suspense>
  );
}

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name}`,
    default: BRAND.name,
  },
  robots: {
    index: false,
    follow: false,
  },
};
