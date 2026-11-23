import type { Figure, Item } from './types';

/**
 * One frame loop for every figure on the page, and the only place that ticks.
 *
 * Three things keep it cheap, because these run under a marketing section that
 * stays on screen while people read:
 *   - one requestAnimationFrame for all figures, never one each;
 *   - a 30fps budget, since the subject is a slow chart, not a game;
 *   - a full stop when no figure is on screen, the tab is hidden, or the
 *     reader asked for reduced motion. Offscreen figures are not drawn at all.
 */

type Sink = (items: Item[], dt: number) => void;

interface Board {
  figure: Figure;
  element: Element;
  sink: Sink;
  visible: boolean;
  last: number;
}

const boards = new Set<Board>();
let frame = 0;
let previous = 0;
let observer: IntersectionObserver | null = null;
let hidden = false;

const STEP = 1000 / 30;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Whether anything is asking to be drawn right now. */
const wantsFrames = () => {
  if (hidden || reducedMotion()) return false;
  for (const board of boards) if (board.visible) return true;
  return false;
};

function tick(now: number) {
  frame = 0;
  const elapsed = now - previous;
  if (elapsed < STEP) {
    schedule();
    return;
  }
  // Clamp a long gap (a background tab, a stall) so nothing jumps on return.
  const dt = Math.min(64, elapsed);
  previous = now;

  for (const board of boards) {
    if (!board.visible) continue;
    board.sink(board.figure.frame(dt), dt);
    board.last = now;
  }

  if (wantsFrames()) schedule();
}

function schedule() {
  if (frame || !wantsFrames()) return;
  frame = requestAnimationFrame(tick);
}

function observe(board: Board) {
  if (typeof IntersectionObserver === 'undefined') {
    board.visible = true;
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          for (const board of boards) {
            if (board.element === entry.target) board.visible = entry.isIntersecting;
          }
        }
        schedule();
      },
      { rootMargin: '120px' },
    );
  }
  observer.observe(board.element);
}

function onVisibility() {
  hidden = document.visibilityState === 'hidden';
  if (!hidden) {
    previous = performance.now();
    schedule();
  }
}

/**
 * Joins the shared loop. `sink` receives a full pose on every drawn frame.
 * Returns `stop`, which leaves the loop and undoes everything, and `redraw`,
 * which paints one pose now — used under reduced motion, where no frames are
 * scheduled but the pointer must still move the bright stroke.
 */
export function animate(figure: Figure, element: Element, sink: Sink) {
  if (reducedMotion()) {
    const redraw = () => sink(figure.frame(0), 0);
    sink(figure.rest(), 0);
    return { stop: () => {}, redraw };
  }

  const board: Board = { figure, element, sink, visible: false, last: 0 };
  boards.add(board);
  observe(board);

  if (boards.size === 1) {
    document.addEventListener('visibilitychange', onVisibility);
    hidden = document.visibilityState === 'hidden';
    previous = performance.now();
  }

  schedule();

  const stop = () => {
    boards.delete(board);
    observer?.unobserve(element);
    if (!boards.size) {
      document.removeEventListener('visibilitychange', onVisibility);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      observer = null;
    }
  };

  return { stop, redraw: () => sink(figure.frame(0), 0) };
}
