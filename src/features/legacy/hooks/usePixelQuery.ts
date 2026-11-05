import { useApi } from '@/components/hooks/useApi';
import { useModified } from '@/components/hooks/useModified';

export function usePixelQuery(pixelId?: string) {
  const { get, useQuery } = useApi();
  const { modified } = useModified(`pixel:${pixelId}`);

  return useQuery({
    queryKey: ['pixel', { pixelId, modified }],
    queryFn: () => {
      return get(`/pixels/${pixelId}`);
    },
    enabled: !!pixelId,
  });
}
