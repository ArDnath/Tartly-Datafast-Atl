import { StatusLight, Text } from '@talivia/react-zen';
import { useMemo } from 'react';
import { useMessages } from '@/components/hooks/index';
import { useActiveUsersQuery } from '@/features/analytics/hooks/useActiveUsersQuery';

export function ActiveUsers({
  websiteId,
  value,
  refetchInterval = 60000,
}: {
  websiteId: string;
  value?: number;
  refetchInterval?: number;
}) {
  const { t, labels } = useMessages();
  const { data } = useActiveUsersQuery(websiteId, { refetchInterval });

  const count = useMemo(() => {
    if (websiteId) {
      return data?.visitors || 0;
    }

    return value !== undefined ? value : 0;
  }, [data, value, websiteId]);

  if (count === 0) {
    return null;
  }

  return (
    <StatusLight variant="success">
      <Text size="sm" weight="medium">
        {count} {t(labels.online)}
      </Text>
    </StatusLight>
  );
}
