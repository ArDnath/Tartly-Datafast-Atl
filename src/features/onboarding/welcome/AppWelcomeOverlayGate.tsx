'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import styles from './Welcome.module.css';

/**
 * The welcome overlay is a single, app-wide instance. Onboarding hands off to
 * `/app?welcome=1`; this gate latches that flag once, mounts one overlay, and
 * lets the overlay consume the flag so a refresh never replays it.
 *
 * The animation chunk is only downloaded on the one navigation that needs it.
 */
const AppWelcomeOverlay = dynamic(
  () =>
    import('@/features/onboarding/welcome/AppWelcomeOverlay').then(
      module => module.AppWelcomeOverlay,
    ),
  { ssr: false },
);

/** Opaque cover painted while the overlay chunk loads, so /app never flashes. */
function WelcomeCover() {
  return <div aria-hidden="true" className={styles.cover} />;
}

function WelcomeGateInner() {
  const searchParams = useSearchParams();

  // Latch the flag: the overlay rewrites the URL with history.replaceState,
  // and reading the live param would unmount the animation immediately.
  const [shouldShowWelcome] = useState(() => searchParams.get('welcome') === '1');
  const [overlayMounted, setOverlayMounted] = useState(false);

  const handleMounted = useCallback(() => setOverlayMounted(true), []);

  if (!shouldShowWelcome) {
    return null;
  }

  return (
    <>
      {overlayMounted ? null : <WelcomeCover />}
      <AppWelcomeOverlay onMounted={handleMounted} />
    </>
  );
}

export function AppWelcomeOverlayGate() {
  return (
    <Suspense fallback={null}>
      <WelcomeGateInner />
    </Suspense>
  );
}
