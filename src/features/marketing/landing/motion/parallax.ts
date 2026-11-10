import { scheduleMotionFrame, subscribeScroll } from './scrollFrame';

interface ParallaxEntry {
  element: HTMLElement;
  speed: number;
  max: number;
  current: number;
}

const entries = new Set<ParallaxEntry>();
let unsubscribe: (() => void) | null = null;

/**
 * Read every rect first, then write every transform. Interleaving reads and
 * writes would force a layout per element and blow the frame budget.
 */
function update() {
  if (entries.size === 0) {
    return;
  }

  const viewport = window.innerHeight;
  const reads: Array<{ entry: ParallaxEntry; visible: boolean; baseCenter: number }> = [];

  for (const entry of entries) {
    const rect = entry.element.getBoundingClientRect();
    reads.push({
      entry,
      visible: rect.bottom > -160 && rect.top < viewport + 160,
      // The rect already includes last frame's translate. Remove it so the
      // measurement never feeds back into the next offset.
      baseCenter: rect.top + rect.height / 2 - entry.current,
    });
  }

  for (const { entry, visible, baseCenter } of reads) {
    if (!visible) {
      continue;
    }

    const offset = Math.max(
      -entry.max,
      Math.min(entry.max, (viewport / 2 - baseCenter) * entry.speed),
    );

    if (Math.abs(offset - entry.current) < 0.05) {
      continue;
    }

    entry.current = offset;
    entry.element.style.setProperty('--lp-parallax-y', `${offset.toFixed(2)}px`);
  }
}

export function registerParallax(element: HTMLElement, speed: number, max: number) {
  const entry: ParallaxEntry = { element, speed, max, current: 0 };
  entries.add(entry);

  if (!unsubscribe) {
    unsubscribe = subscribeScroll(update);
  }

  scheduleMotionFrame();

  return () => {
    entries.delete(entry);
    element.style.setProperty('--lp-parallax-y', '0px');

    if (entries.size === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}
