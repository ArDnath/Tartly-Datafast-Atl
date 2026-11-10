'use client';

import { useCallback, useRef, useState } from 'react';
import { WelcomeHalftoneCanvasEffect } from '@/features/onboarding/welcome/halftone/welcome-halftone-canvas-effect';
import styles from '../Welcome.module.css';

type WelcomeHalftoneCanvasProps = {
  isLeaving: boolean;
};

export const WelcomeHalftoneCanvas = ({ isLeaving }: WelcomeHalftoneCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWorkerFailed, setHasWorkerFailed] = useState(false);
  const markWorkerAsFailed = useCallback(() => setHasWorkerFailed(true), []);

  return (
    <>
      <canvas
        key={hasWorkerFailed ? 'main-thread' : 'worker'}
        ref={canvasRef}
        aria-hidden="true"
        className={styles.canvas}
      />
      <WelcomeHalftoneCanvasEffect
        canvasRef={canvasRef}
        isLeaving={isLeaving}
        hasWorkerFailed={hasWorkerFailed}
        onWorkerFailed={markWorkerAsFailed}
      />
    </>
  );
};
