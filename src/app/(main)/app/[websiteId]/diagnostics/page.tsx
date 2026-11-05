import type { Metadata } from 'next';
import { RevenueDiagnosticsPage } from '@/features/websites/workbench/reports/revenue-diagnostics/RevenueDiagnosticsPage';

export default async function ({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;

  return <RevenueDiagnosticsPage websiteId={websiteId} />;
}

export const metadata: Metadata = {
  title: 'Diagnostics',
};
