/**
 * Scroll state machine for the landing navbar.
 *
 * Raw scroll deltas are tiny and noisy (trackpad inertia, mobile URL-bar
 * collapse, overscroll bounce), so switching `showNavbar` on every direction
 * change makes the bar flicker. Movement must accumulate in one direction past
 * a threshold before the visibility flips, and direction changes reset the
 * accumulator. The "at top" flag gets the same hysteresis so the shadow does
 * not pulse while hovering around the boundary.
 */

const HIDE_AFTER_PX = 8;
const REVEAL_AFTER_PX = 12;
const HIDE_MIN_SCROLL_PX = 80;
const TOP_ENTER_PX = 4;
const TOP_EXIT_PX = 24;

export type NavScrollState = {
  lastY: number;
  travelledUp: number;
  travelledDown: number;
  show: boolean;
  atTop: boolean;
};

export type NavScrollResult = {
  state: NavScrollState;
  showChanged: boolean;
  atTopChanged: boolean;
};

export function createNavScrollState(y: number): NavScrollState {
  const initialY = Math.max(0, y);

  return {
    lastY: initialY,
    travelledUp: 0,
    travelledDown: 0,
    show: true,
    atTop: initialY <= TOP_ENTER_PX,
  };
}

export function resolveNavScroll(state: NavScrollState, rawY: number): NavScrollResult {
  const y = Math.max(0, rawY);
  const delta = y - state.lastY;

  let travelledUp = state.travelledUp;
  let travelledDown = state.travelledDown;

  if (delta > 0) {
    travelledDown += delta;
    travelledUp = 0;
  } else if (delta < 0) {
    travelledUp -= delta;
    travelledDown = 0;
  }

  let show = state.show;

  if (y === 0) {
    show = true;
    travelledUp = 0;
    travelledDown = 0;
  } else if (show && travelledDown >= HIDE_AFTER_PX && y > HIDE_MIN_SCROLL_PX) {
    show = false;
    travelledDown = 0;
  } else if (!show && travelledUp >= REVEAL_AFTER_PX) {
    show = true;
    travelledUp = 0;
  }

  // Hysteresis: entering "top" needs a near-zero position, leaving it needs a
  // slightly larger one, so jitter around the boundary cannot toggle the shadow.
  let atTop = state.atTop;
  if (y <= TOP_ENTER_PX) {
    atTop = true;
  } else if (y >= TOP_EXIT_PX) {
    atTop = false;
  }

  return {
    state: { lastY: y, travelledUp, travelledDown, show, atTop },
    showChanged: show !== state.show,
    atTopChanged: atTop !== state.atTop,
  };
}
