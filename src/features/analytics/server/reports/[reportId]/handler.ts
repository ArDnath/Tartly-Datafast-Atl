import { parseRequest } from '@/lib/request';
import { forbidden, json, notFound, ok, unauthorized } from '@/lib/response';
import { reportSchema } from '@/lib/schema';
import { getShareSectionForReportType, isShareSectionAllowed } from '@/lib/share-sections';
import {
  canDeleteReport,
  canUpdateReport,
  canViewReport,
} from '@/features/analytics/lib/report-permissions';
import { deleteReport, getReport, updateReport } from '@/features/analytics/server/queries/report';

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { reportId } = await params;

  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  if (!(await canViewReport(auth, report))) {
    return unauthorized();
  }

  if (auth.shareToken) {
    const section = getShareSectionForReportType(report.type);

    if (!section || !isShareSectionAllowed(auth.shareToken.parameters, [section])) {
      return forbidden({
        message: 'This report is not available from this shared dashboard.',
        code: 'share-section-forbidden',
      });
    }
  }

  return json(report);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { auth, body, error } = await parseRequest(request, reportSchema);

  if (error) {
    return error();
  }

  const { reportId } = await params;
  const { type, name, description, parameters } = body;

  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  if (!(await canUpdateReport(auth, report))) {
    return unauthorized();
  }

  const result = await updateReport(reportId, {
    // A report cannot be moved between websites by an update. That would be a
    // cross-tenant write disguised as a normal edit.
    websiteId: report.websiteId,
    type,
    name,
    description,
    parameters,
  } as any);

  return json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { reportId } = await params;
  const report = await getReport(reportId);

  if (!report) {
    return notFound();
  }

  if (!(await canDeleteReport(auth, report))) {
    return unauthorized();
  }

  await deleteReport(reportId);

  return ok();
}
