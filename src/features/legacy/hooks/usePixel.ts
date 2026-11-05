import { useContext } from 'react';
import { PixelContext } from '@/features/legacy/pixels/PixelProvider';

export function usePixel() {
  return useContext(PixelContext);
}
