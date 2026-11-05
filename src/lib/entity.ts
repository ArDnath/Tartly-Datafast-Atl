import type { Board, Link, Pixel, Website } from '@/generated/prisma/client';
import { getBoard } from '@/queries/prisma/board';
import { getLink } from '@/queries/prisma/link';
import { getPixel } from '@/queries/prisma/pixel';
import { getWebsite } from '@/queries/prisma';

export async function getEntity(entityId: string): Promise<Website | Link | Pixel | Board | null> {
  const [website, link, pixel, board] = await Promise.all([
    getWebsite(entityId),
    getLink(entityId),
    getPixel(entityId),
    getBoard(entityId),
  ]);

  const entity = website || link || pixel || board;

  return entity;
}
