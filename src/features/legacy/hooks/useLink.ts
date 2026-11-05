import { useContext } from 'react';
import { LinkContext } from '@/features/legacy/links/LinkProvider';

export function useLink() {
  return useContext(LinkContext);
}
