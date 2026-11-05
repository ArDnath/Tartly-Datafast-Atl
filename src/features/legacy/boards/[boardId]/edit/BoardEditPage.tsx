'use client';
import { Column } from '@talivia/react-zen';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages, useNavigation } from '@/components/hooks';
import { ArrowLeft, LayoutDashboard } from '@/components/icons';
import { BoardEditForm } from '@/features/legacy/boards/BoardEditForm';
import { useBoardQuery } from '@/features/legacy/hooks/useBoardQuery';

export function BoardEditPage({ boardId }: { boardId: string }) {
  const { data: board } = useBoardQuery(boardId);
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();

  return (
    <PageBody>
      <Column margin="2" width="100%" maxWidth="800px" style={{ marginInline: 'auto' }}>
        <Column marginTop="6">
          <Link href={renderUrl(`/boards/${boardId}`)}>
            <IconLabel icon={<ArrowLeft />} label="Board" />
          </Link>
        </Column>
        <PageHeader
          title={board?.name || t(labels.untitled)}
          description={board?.description}
          icon={<LayoutDashboard />}
        />
        <Panel>
          <BoardEditForm boardId={boardId} />
        </Panel>
      </Column>
    </PageBody>
  );
}
