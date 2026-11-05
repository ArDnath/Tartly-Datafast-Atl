import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';

export function useReportQuery(reportId: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`report:${reportId}`);

  return useQuery({
    queryKey: ['report', { reportId, modified }],
    queryFn: () => {
      return get(`/reports/${reportId}`);
    },
    enabled: !!reportId,
  });
}
