/**
 * One shared, frame-throttled scroll bus for the marketing page.
 *
 * Every scroll-driven effect (nav state, the process spine, parallax) subscribes
 * here instead of attaching its own `scroll` listener. The browser then runs at
 * most one scroll callback per animation frame, which keeps the page inside its
 * 60fps budget and guarantees there is no unthrottled scroll listener.
 */

type ScrollTask = () => void;

const tasks = new Set<ScrollTask>();
let frame = 0;
let listening = false;

function runTasks() {
  frame = 0;

  // Copy first: a task may unsubscribe while the frame is running.
  for (const task of Array.from(tasks)) {
    task();
  }
}

export function scheduleMotionFrame() {
  if (typeof window === 'undefined' || frame !== 0) {
    return;
  }

  frame = window.requestAnimationFrame(runTasks);
}

function attach() {
  if (listening || typeof window === 'undefined') {
    return;
  }

  listening = true;
  window.addEventListener('scroll', scheduleMotionFrame, { passive: true });
  window.addEventListener('resize', scheduleMotionFrame);
}

function detach() {
  if (!listening) {
    return;
  }

  listening = false;
  window.removeEventListener('scroll', scheduleMotionFrame);
  window.removeEventListener('resize', scheduleMotionFrame);

  if (frame !== 0) {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }
}

export function subscribeScroll(task: ScrollTask) {
  tasks.add(task);
  attach();
  scheduleMotionFrame();

  return () => {
    tasks.delete(task);

    if (tasks.size === 0) {
      detach();
    }
  };
}
