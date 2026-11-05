import type { BoardEntityType } from '@/features/legacy/boards/core/boards';
import { useLinkQuery } from '@/features/legacy/hooks/useLinkQuery';
import { usePixelQuery } from '@/features/legacy/hooks/usePixelQuery';
import { useWebsiteQuery } from '@/features/websites/hooks/useWebsiteQuery';

export function useBoardEntityBadgeProps(
  entityType?: BoardEntityType,
  entityId?: string,
  enabled = true,
) {
  const { data: website } = useWebsiteQuery(
    enabled && entityType === 'website' ? entityId : undefined,
  );
  const { data: pixel } = usePixelQuery(enabled && entityType === 'pixel' ? entityId : undefined);
  const { data: link } = useLinkQuery(enabled && entityType === 'link' ? entityId : undefined);

  if (entityType === 'website' && website?.name) {
    return { type: entityType, name: website.name, domain: website.domain ?? undefined };
  }

  if (entityType === 'pixel' && pixel?.name) {
    return { type: entityType, name: pixel.name };
  }

  if (entityType === 'link' && link?.name) {
    return { type: entityType, name: link.name };
  }

  return null;
}
