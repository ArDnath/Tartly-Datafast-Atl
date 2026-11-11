'use client';

import { useEffect, useRef } from 'react';

const WELCOME_HOLD_MS = 2900;
const WELCOME_REDUCED_HOLD_MS = 1100;

/**
 * Holds the title long enough for the word reveal to finish, then leaves.
 *
 * The sibling overlay flies its title into a chat preamble. This app
 * has no chat surface, so the same hold now ends in the overlay fade.
 */
export const WelcomeAnimationAutoLeaveEffect = ({
  onLeave,
  reducedMotion,
}: {
  onLeave: () => void;
  reducedMotion: boolean;
}) => {
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    const timeoutId = setTimeout(
      () => onLeaveRef.current(),
      reducedMotion ? WELCOME_REDUCED_HOLD_MS : WELCOME_HOLD_MS,
    );

    return () => clearTimeout(timeoutId);
  }, [reducedMotion]);

  return null;
};
