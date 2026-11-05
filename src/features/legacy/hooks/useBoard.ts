import { useContext } from 'react';
import { BoardContext, type BoardContextValue } from '@/features/legacy/boards/BoardProvider';

export function useBoard(): BoardContextValue {
  return useContext(BoardContext);
}
