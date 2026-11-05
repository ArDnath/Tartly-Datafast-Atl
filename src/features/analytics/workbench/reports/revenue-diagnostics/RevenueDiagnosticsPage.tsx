'use client';
import { Column } from '@talivia/react-zen';
import { WebsiteControls } from '@/features/analytics/workbench/WebsiteControls';
import { RevenueDiagnostics } from './RevenueDiagnostics';

export function RevenueDiagnosticsPage({ websiteId }: { websiteId: string }) {
  return (
    <Column gap>
      <WebsiteControls websiteId={websiteId} allowFilter={false} />
      <RevenueDiagnostics websiteId={websiteId} />
    </Column>
  );
}
