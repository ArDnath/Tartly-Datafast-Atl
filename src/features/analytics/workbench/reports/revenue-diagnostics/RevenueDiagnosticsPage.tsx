'use client';
import { Column } from '@talivia/react-zen';
import { RevenueDiagnostics } from './RevenueDiagnostics';

export function RevenueDiagnosticsPage({ websiteId }: { websiteId: string }) {
  return (
    <Column gap>
      <RevenueDiagnostics websiteId={websiteId} />
    </Column>
  );
}
