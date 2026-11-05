export const BOARD_TYPES = {
  dashboard: 'dashboard',
  mixed: 'mixed',
  website: 'website',
  pixel: 'pixel',
  link: 'link',
} as const;

export const BOARD_ENTITY_TYPES = {
  website: 'website',
  pixel: 'pixel',
  link: 'link',
} as const;

export type BoardType = (typeof BOARD_TYPES)[keyof typeof BOARD_TYPES];
export type BoardEntityType = (typeof BOARD_ENTITY_TYPES)[keyof typeof BOARD_ENTITY_TYPES];
