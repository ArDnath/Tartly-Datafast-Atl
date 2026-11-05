import { Box } from '@talivia/react-zen';
import {
  BOARD_ENTITY_TYPES,
  getBoardEntity,
  getFirstBoardComponentEntity,
} from '@/features/legacy/boards/core/boards';
import { useBoard } from '@/features/legacy/hooks/useBoard';
import { LinkControls } from '@/features/legacy/links/[linkId]/LinkControls';
import { PixelControls } from '@/features/legacy/pixels/[pixelId]/PixelControls';
import { WebsiteControls } from '@/features/websites/workbench/WebsiteControls';

export function BoardControls() {
  const { board } = useBoard();
  const boardEntity = getBoardEntity(board);
  const fallbackEntity = getFirstBoardComponentEntity(board);
  const entityType = boardEntity.entityType || fallbackEntity.entityType;
  const entityId = boardEntity.entityId || fallbackEntity.entityId;

  if (!entityId) {
    return null;
  }

  return (
    <Box marginBottom="4">
      {entityType === BOARD_ENTITY_TYPES.pixel ? (
        <PixelControls pixelId={entityId} />
      ) : entityType === BOARD_ENTITY_TYPES.link ? (
        <LinkControls linkId={entityId} />
      ) : (
        <WebsiteControls websiteId={entityId} />
      )}
    </Box>
  );
}
