'use client';
import { Column } from '@talivia/react-zen';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages, useNavigation } from '@/components/hooks';
import { ArrowLeft, Grid2x2 } from '@/components/icons';
import { usePixel } from '@/features/legacy/hooks/usePixel';
import { PixelShareForm } from '@/features/legacy/pixels/[pixelId]/PixelShareForm';
import { PixelEditForm } from '@/features/legacy/pixels/PixelEditForm';
import { PixelProvider } from '@/features/legacy/pixels/PixelProvider';

export function PixelEditPage({ pixelId }: { pixelId: string }) {
  return (
    <PixelProvider pixelId={pixelId}>
      <Column margin="2" width="100%" maxWidth="800px" style={{ marginInline: 'auto' }}>
        <PixelEditHeader />
        <Column gap="6">
          <Panel>
            <PixelEditForm pixelId={pixelId} />
          </Panel>
          <Panel>
            <PixelShareForm pixelId={pixelId} />
          </Panel>
        </Column>
      </Column>
    </PixelProvider>
  );
}

function PixelEditHeader() {
  const pixel = usePixel();
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();

  return (
    <>
      <Column marginTop="6">
        <Link href={renderUrl(`/pixels/${pixel.id}`)}>
          <IconLabel icon={<ArrowLeft />} label={t(labels.pixel)} />
        </Link>
      </Column>
      <PageHeader title={pixel.name} icon={<Grid2x2 />} />
    </>
  );
}
