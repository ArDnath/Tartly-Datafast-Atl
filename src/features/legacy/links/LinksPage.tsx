'use client';
import { Column } from '@talivia/react-zen';
import { PageBody } from '@/components/common/PageBody';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { LinksDataTable } from '@/features/legacy/links/LinksDataTable';
import { ROLES } from '@/lib/constants';
import { LinkAddButton } from './LinkAddButton';

export function LinksPage() {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const showActions = user.role !== ROLES.viewOnly;

  return (
    <PageBody>
      <Column gap="6" margin="2">
        <PageHeader title={t(labels.links)}>{showActions && <LinkAddButton />}</PageHeader>
        <Panel>
          <LinksDataTable showActions={showActions} />
        </Panel>
      </Column>
    </PageBody>
  );
}
