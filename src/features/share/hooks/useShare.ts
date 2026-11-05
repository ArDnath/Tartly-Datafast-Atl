import { useContext } from 'react';
import { ShareContext } from '@/features/share/ShareProvider';

export function useShare() {
  return useContext(ShareContext);
}
