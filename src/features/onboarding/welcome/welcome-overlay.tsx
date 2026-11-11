'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { BRAND } from '@/lib/brand';
import { WelcomeHalftoneCanvas } from './halftone/welcome-halftone-canvas';
import styles from './Welcome.module.css';
import { WelcomeAnimationAutoLeaveEffect } from './welcome-animation-auto-leave-effect';
import { WelcomeAnimationForcedTeardownEffect } from './welcome-animation-forced-teardown-effect';
import { WelcomePersonChip } from './welcome-person-chip';

type WelcomeOverlayProps = {
  isVisible: boolean;
  isLeaving: boolean;
  userName: string;
  userImage: string | null;
  onAutoLeave: () => void;
  onTeardown: () => void;
};

const subscribeToNothing = () => () => {};

/** Portal/DOM-dependent overlay must only render on the client. */
const useIsClient = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

/**
 * The singleton welcome moment ported from the sibling app: an opaque
 * canvas, the animated halftone dash field, a word-by-word title, and the
 * signed-in person chip. The halftone renderer, particle layout, dash data and
 * canvas lifecycle are copied directly from the reference implementation.
 */
export const WelcomeOverlay = ({
  isVisible,
  isLeaving,
  userName,
  userImage,
  onAutoLeave,
  onTeardown,
}: WelcomeOverlayProps) => {
  const isClient = useIsClient();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setReducedMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }, []);

  if (!isClient || !isVisible) {
    return null;
  }

  const words = `Welcome to ${BRAND.name}`.split(' ');

  return createPortal(
    <div
      aria-live="polite"
      aria-label={`Welcome to ${BRAND.name}`}
      className={`${styles.overlay} ${isLeaving ? styles.leaving : ''}`}
      data-reduced={reducedMotion ? 'true' : undefined}
      role="status"
    >
      {isLeaving ? (
        <WelcomeAnimationForcedTeardownEffect onTeardown={onTeardown} />
      ) : (
        <WelcomeAnimationAutoLeaveEffect onLeave={onAutoLeave} reducedMotion={reducedMotion} />
      )}

      <div aria-hidden="true" className={styles.backdrop} />

      <div aria-hidden="true" className={styles.halftoneLayer}>
        <WelcomeHalftoneCanvas isLeaving={isLeaving} />
      </div>

      <div className={styles.title}>
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={styles.word}
            style={{ animationDelay: reducedMotion ? '0ms' : `${1100 + index * 70}ms` }}
          >
            {word}
          </span>
        ))}
        <span
          className={styles.chipWrap}
          style={{
            animationDelay: reducedMotion ? '0ms' : `${1100 + words.length * 70}ms`,
          }}
        >
          <WelcomePersonChip name={userName} image={userImage} useBrandLogo />
        </span>
      </div>
    </div>,
    document.body,
  );
};
