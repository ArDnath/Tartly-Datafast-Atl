import { DataGrid } from '@/components/common/DataGrid';
import { useGridState } from '@/components/hooks';
import { useReplaysQuery } from '@/features/analytics/hooks/useReplaysQuery';
import { ReplaysTable } from './ReplaysTable';

export function ReplaysDataTable({
  websiteId,
  onReplayOpen,
}: {
  websiteId: string;
  onReplayOpen: (replayId: string) => void;
}) {
  const grid = useGridState({ source: 'local' });
  const queryResult = useReplaysQuery(websiteId, grid.query);

  return (
    <DataGrid query={queryResult} state={grid} allowPaging allowSearch>
      {({ data }) => {
        return <ReplaysTable data={data} onReplayOpen={onReplayOpen} />;
      }}
    </DataGrid>
  );
}
