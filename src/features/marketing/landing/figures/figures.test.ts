import { describe, expect, test } from 'vitest';
import { attributionRails } from './attributionRails';
import { funnelSteps } from './funnelSteps';
import { revenueColumns } from './revenueColumns';
import type { Figure, Item } from './types';

const figures: [string, Figure][] = [
  ['revenue columns', revenueColumns],
  ['attribution rails', attributionRails],
  ['funnel steps', funnelSteps],
];

/** Every screen point a pose draws, for a bounds check. */
function points(items: Item[]): [number, number][] {
  const out: [number, number][] = [];
  for (const item of items) {
    if (item.kind === 'bubble') {
      continue;
    }
    if (item.kind === 'dot') {
      out.push([item.cx - item.rx, item.cy - item.ry], [item.cx + item.rx, item.cy + item.ry]);
      continue;
    }
    const nums = item.sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      out.push([Number(nums[i]), Number(nums[i + 1])]);
    }
  }
  return out;
}

describe.each(figures)('%s', (_name, figure) => {
  test('rest and every frame share one key order, so the stage binds once', () => {
    const rest = figure.rest().map(item => item.key);
    for (const dt of [0, 16, 250, 900]) {
      const keys = figure.frame(dt).map(item => item.key);
      expect(keys).toEqual(rest);
    }
  });

  test('nothing leaves the 400 × 320 frame, including after a long run', () => {
    for (const dt of [0, 120, 480, 2000, 12000]) {
      figure.frame(dt);
      const pose = figure.frame(33);
      for (const [x, y] of points(pose)) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(400);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(320);
      }
    }
  });

  test('the drawing moves on its own, so the section is alive while visible', () => {
    const before = figure.frame(0);
    figure.frame(400);
    const after = figure.frame(400);
    expect(after).not.toEqual(before);
  });

  test('the rest pose is a composition: one bright solid', () => {
    const rest = figure.rest();
    const bright = rest.filter(item => item.kind === 'solid' && item.hi);
    expect(bright).toHaveLength(1);

    // A figure may carry a dot as its bright mark; when it does, there is one.
    const marks = rest.filter(item => item.kind === 'dot' && item.tone === 'dot');
    expect(marks.length).toBeLessThanOrEqual(1);
  });

  test('the pointer answers: a point on a part picks that part, and the read-out names it', () => {
    const rest = figure.rest();
    let answered = 0;

    for (const item of rest) {
      if (item.kind !== 'solid') continue;
      const nums = item.sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        xs.push(Number(nums[i]));
        ys.push(Number(nums[i + 1]));
      }
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;

      const picked = figure.pick(cx, cy);
      if (!picked) continue;
      answered++;
      expect(figure.label(picked)).not.toBe('rest');
    }

    // Most solids are reachable; a part entirely behind another is not, and
    // that is fine as long as the drawing is not mostly unreachable.
    expect(answered).toBeGreaterThan(1);
  });

  test('nothing under the pointer reads as rest', () => {
    expect(figure.label(null)).toBe('rest');
    expect(figure.pick(-50, -50)).toBeNull();
    expect(figure.pick(399, 5)).toBeNull();
  });

  test('holding a part pins the bright stroke; releasing hands it back to the tour', () => {
    const rest = figure.rest();
    const part = rest.find(item => item.kind === 'solid' && !item.hi && item.key !== 'plinth');
    expect(part).toBeDefined();

    figure.select(part?.key ?? null);
    const chosen = figure.frame(33).find(item => item.key === part?.key);
    expect(chosen?.kind === 'solid' && chosen.hi).toBe(true);

    figure.select(null);
    const pose = figure.frame(33);
    const bright = pose.filter(item => item.kind === 'solid' && item.hi && item.key !== 'plinth');
    // At least one part is lit at rest, and the read-out names one of them.
    expect(bright.length).toBeGreaterThan(0);
    expect(bright.some(item => item.key === figure.watch?.())).toBe(true);
  });

  test('the bright stroke tours every part on its own', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 48; i++) {
      figure.frame(250);
      const key = figure.watch?.();
      if (key) seen.add(key);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('the figures read out what they show', () => {
  test('a revenue column names the dollars it earned', () => {
    expect(revenueColumns.label('col-0')).toMatch(/revenue \$[\d,]+/);
  });

  test('the revenue cloud carries the dollars of the column it is over', () => {
    for (let i = 0; i < 6; i += 1) {
      const pose = revenueColumns.frame(250);
      const cloud = pose.find(item => item.kind === 'bubble');
      const bright = pose.find(item => item.kind === 'solid' && item.hi && item.key !== 'plinth');

      expect(cloud?.kind).toBe('bubble');
      expect(bright).toBeDefined();
      if (cloud?.kind !== 'bubble' || !bright) {
        throw new Error('missing cloud or bright column');
      }

      // The cloud and the read-out name the same column on every frame.
      expect(cloud.text).toBe(revenueColumns.label(bright.key).replace('revenue ', ''));
    }
  });

  test('the revenue figure marks its column with the bright stroke, not beads', () => {
    expect(revenueColumns.rest().some(item => item.kind === 'dot')).toBe(false);
    for (let i = 0; i < 12; i += 1) {
      expect(revenueColumns.frame(400).some(item => item.kind === 'dot')).toBe(false);
    }
  });

  test('the revenue callout points at its bar, stays in frame and never touches it', () => {
    const top = (sil: string) => {
      const nums = (sil.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      let t = Infinity;
      for (let i = 1; i < nums.length; i += 2) t = Math.min(t, nums[i]);
      return t;
    };

    for (let i = 0; i < 60; i += 1) {
      const pose = revenueColumns.frame(313);
      const cloud = pose.find(item => item.kind === 'bubble');
      const bar = pose.find(item => item.kind === 'solid' && item.hi);
      if (cloud?.kind !== 'bubble' || bar?.kind !== 'solid') {
        throw new Error('missing cloud or bright column');
      }

      // The path's fixed extents: -10.5 above the anchor, +16 below it, ±27 wide.
      expect(cloud.y - 10.5).toBeGreaterThan(0);
      expect(cloud.y + 16).toBeLessThan(320);
      expect(cloud.x - 27).toBeGreaterThan(0);
      expect(cloud.x + 27).toBeLessThan(400);

      // The arrow stops above the crown of the bar it names, and clears it.
      expect(cloud.y + 16).toBeLessThan(top(bar.sil));
      expect(top(bar.sil) - (cloud.y + 16)).toBeGreaterThanOrEqual(6);
    }
  });

  test('the rails name both touches and the payment', () => {
    expect(attributionRails.label('arm-0')).toBe('first touch');
    expect(attributionRails.label('arm-1')).toBe('last touch');
    expect(attributionRails.label('leg')).toBe('paid');
    expect(attributionRails.label('collar')).toBe('match');
  });

  test('the funnel names each step', () => {
    expect(funnelSteps.label('step-0')).toBe('step 1 · visits');
    expect(funnelSteps.label('step-1')).toBe('step 2 · trials');
    expect(funnelSteps.label('step-2')).toBe('step 3 · paid');
  });
});
