import { useContext } from 'react';
import { WebsiteContext } from '@/features/websites/WebsiteProvider';

export function useWebsite() {
  return useContext(WebsiteContext);
}
