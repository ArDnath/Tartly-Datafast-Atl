'use client';

import { useEffect, useState } from 'react';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { WelcomeOverlay } from './welcome-overlay';

/**
 * The one-shot welcome overlay shown over the real `/app` surface after
 * onboarding. The gate above mounts a single instance and this component
 * consumes the `?welcome=1` flag so a refresh never replays it.
 */
export function AppWelcomeOverlay({ onMounted }: { onMounted?: () => void }) {
  const { user } = useLoginQuery();
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    onMounted?.();

    const url = new URL(window.location.href);

    if (url.searchParams.has('welcome')) {
      url.searchParams.delete('welcome');
      window.history.replaceState(null, '', url.toString());
    }
  }, [onMounted]);

  const userName = user?.displayName?.trim() || user?.username || 'there';

  return (
    <WelcomeOverlay
      isVisible={isVisible}
      isLeaving={isLeaving}
      userName={userName}
      userImage={user?.logoUrl ?? null}
      onAutoLeave={() => setIsLeaving(true)}
      onTeardown={() => {
        setIsVisible(false);
        setIsLeaving(false);
      }}
    />
  );
}
