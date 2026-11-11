'use client';
import { Column } from '@talivia/react-zen';
import { Revenue } from './Revenue';

export function RevenuePage({ websiteId }: { websiteId: string }) {
  return (
    <Column gap="3">
      <Revenue websiteId={websiteId} />
    </Column>
  );
}
