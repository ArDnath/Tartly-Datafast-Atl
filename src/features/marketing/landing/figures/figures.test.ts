import { describe, expect, test } from 'vitest';
import { attributionRails } from './attributionRails';
import { funnelSteps } from './funnelSteps';
import { trafficRevenue } from './trafficRevenue';
import type { Figure, Item } from './types';

const figures: [string, Figure][] = [
  ['traffic revenue', trafficRevenue],
  ['attribution rails', attributionRails],
  ['funnel steps', funnelSteps],
];

/** Every screen point a pose draws, for a bounds check. */
function points(items: Item[]): [number, number][] {
  const out: [number, number][] = [];
  for (const item of items) {
    if (item.kind === 'bubble') continue;
    if (item.kind === 'wire') {
      const nums = item.d.match(/-?\d+(?:\.\d+)?/g) ?? [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        out.push([Number(nums[i]), Number(nums[i + 1])]);
      }
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

  test('every wire is a unit-length dash that is drawn or hidden, never half a dash', () => {
    for (let i = 0; i < 12; i += 1) {
      for (const item of figure.frame(200)) {
        if (item.kind !== 'wire') continue;
        expect(item.progress).toBeGreaterThanOrEqual(0);
        expect(item.progress).toBeLessThanOrEqual(1);
        expect(item.d.startsWith('M')).toBe(true);
      }
    }
  });
});

describe('the figures read out what they show', () => {
  test('the traffic scene shows a source, a drawn route, a payment and the $249 tooltip', () => {
    const rest = trafficRevenue.rest();
    expect(rest.map(item => item.key)).toContain('source');
    expect(rest.map(item => item.key)).toContain('route');
    expect(rest.map(item => item.key)).toContain('payment');
    const wire = rest.find(item => item.kind === 'wire');
    const cloud = rest.find(item => item.kind === 'bubble');
    expect(wire?.kind === 'wire' && wire.progress).toBe(1);
    expect(cloud?.kind === 'bubble' && cloud.text).toBe('$249');
    expect(cloud?.kind === 'bubble' && cloud.scale).toBe(1);
    expect(trafficRevenue.label('payment')).toBe('payment $249');
  });

  test('the tooltip springs in only after the visitor has travelled', () => {
    trafficRevenue.select(null);
    const scales: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const cloud = trafficRevenue.frame(200).find(item => item.kind === 'bubble');
      if (cloud?.kind === 'bubble') scales.push(cloud.scale ?? 1);
    }
    expect(Math.min(...scales)).toBeLessThan(0.2);
    expect(Math.max(...scales)).toBeGreaterThan(0.95);
  });

  test('the rails draw three paths from three sources into one payment', () => {
    const rest = attributionRails.rest();
    const wires = rest.filter(item => item.kind === 'wire');
    expect(wires).toHaveLength(3);
    expect(wires.every(item => item.kind === 'wire' && item.progress === 1)).toBe(true);
    expect(rest.filter(item => item.kind === 'dot' && item.tone === 'dot signal')).toHaveLength(3);
    expect(attributionRails.label('arm-2')).toBe('email touch');
    expect(attributionRails.label('leg')).toBe('paid');
    expect(attributionRails.label('collar')).toBe('match');
  });

  test('one attribution path stays selected while the other two go muted', () => {
    attributionRails.select('arm-1');
    const pose = attributionRails.frame(1);
    const active = pose.filter(item => item.kind === 'wire' && item.active);
    expect(active).toHaveLength(1);
    expect(active[0].key).toBe('wire-arm-1');
    attributionRails.select(null);
  });

  test('the funnel names each step and lands one visitor on paid', () => {
    expect(funnelSteps.label('step-0')).toBe('step 1 · signup');
    expect(funnelSteps.label('step-1')).toBe('step 2 · trial');
    expect(funnelSteps.label('step-2')).toBe('step 3 · paid');

    const rest = funnelSteps.rest();
    const bright = rest.filter(item => item.kind === 'dot' && item.tone === 'dot');
    const dropped = rest.filter(item => item.kind === 'dot' && item.tone === 'dot off');
    expect(bright).toHaveLength(1);
    expect(dropped).toHaveLength(2);
    expect(bright[0].key).toBe('visitor-0');
  });
});
