'use client';

import { useEffect, useState } from 'react';
import { getItem, setItem } from '@/lib/storage';

/**
 * State backed by localStorage without breaking hydration.
 *
 * The first render always uses `fallback`, which is also what the server
 * rendered. The stored value is applied in an effect after mount, so the
 * browser and server agree during hydration.
 */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const stored = getItem(key);

    if (stored !== null && stored !== undefined) {
      setValue(stored as T);
    }
  }, [key]);

  const update = (next: T) => {
    setItem(key, next);
    setValue(next);
  };

  return [value, update] as const;
}
