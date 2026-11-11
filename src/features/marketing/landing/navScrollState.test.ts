import { describe, expect, test } from 'vitest';
import { createNavScrollState, type NavScrollState, resolveNavScroll } from './navScrollState';

function scrollTo(state: NavScrollState, ...positions: number[]) {
  return positions.reduce((current, y) => {
    const result = resolveNavScroll(current, y);
    return result.state;
  }, state);
}

describe('nav scroll state', () => {
  test('starts visible and reports the top shadow correctly', () => {
    expect(createNavScrollState(0)).toMatchObject({ show: true, atTop: true });
    expect(createNavScrollState(400)).toMatchObject({ show: true, atTop: false });
  });

  test('hides only after sustained downward movement past the fold', () => {
    const state = scrollTo(createNavScrollState(0), 40);

    expect(state.show).toBe(true);
    expect(scrollTo(state, 96).show).toBe(false);
  });

  test('does not toggle on small noisy deltas', () => {
    let state = createNavScrollState(0);

    // Trackpad/URL-bar jitter: tiny moves both ways must not hide the navbar.
    for (const y of [3, 1, 5, 2, 7, 4, 9, 5, 10, 6]) {
      state = resolveNavScroll(state, y).state;
    }

    expect(state.show).toBe(true);
  });

  test('reveals again after a deliberate upward scroll', () => {
    const hidden = scrollTo(createNavScrollState(0), 200);

    expect(hidden.show).toBe(false);
    expect(scrollTo(hidden, 196).show).toBe(false);
    expect(scrollTo(hidden, 180).show).toBe(true);
  });

  test('resets the accumulator when the scroll direction flips', () => {
    let state = createNavScrollState(100);

    // 7px down, 7px up repeats: neither threshold is ever reached.
    for (let i = 0; i < 10; i += 1) {
      state = scrollTo(state, 107);
      state = scrollTo(state, 100);
    }

    expect(state.show).toBe(true);
  });

  test('always shows the navbar at the very top', () => {
    const hidden = scrollTo(createNavScrollState(0), 200);
    const top = scrollTo(hidden, 0);

    expect(hidden.show).toBe(false);
    expect(top).toMatchObject({ show: true, atTop: true });
  });

  test('keeps the shadow stable around the top boundary', () => {
    const state = scrollTo(createNavScrollState(0), 4, 10, 6, 12, 8);

    expect(state.atTop).toBe(true);
    expect(scrollTo(state, 24).atTop).toBe(false);
    expect(scrollTo(scrollTo(state, 24), 10).atTop).toBe(false);
  });

  test('reports which values changed so callers can skip redundant renders', () => {
    const initial = createNavScrollState(0);
    const result = resolveNavScroll(initial, 120);

    expect(result.showChanged).toBe(true);
    expect(result.atTopChanged).toBe(true);

    const unchanged = resolveNavScroll(result.state, 121);
    expect(unchanged.showChanged).toBe(false);
    expect(unchanged.atTopChanged).toBe(false);
  });
});
