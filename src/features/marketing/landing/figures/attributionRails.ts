import type { Camera, Point, Projector } from './iso';
import {
  camera,
  capsule,
  capsuleInset,
  clamp,
  contains,
  facing,
  frameTo,
  openPath,
  projector,
  r2,
  rings,
  solidGeom,
} from './iso';
import type { Item } from './types';

/**
 * Stage 02 — every payment, traced.
 *
 * Three source markers on a plinth feed a central payment node. Each source
 * appears in turn, then its orange wire draws towards the join over 900 ms.
 * The selected touch stays orange while the other paths stay muted, and the
 * payment carries the `$249` callout. The bright stroke and read-out follow the
 * active hand, so the drawing narrates the match.
 */

const W = 100;
const DEEP = 100;
const PLINTH = 7;
const PAD = 6;
const RAIL = 8;
const H = 18;
const COLLAR = 10;
const HUB_X = 44;
const HUB_Y = 44;
const END = 82;

/** The plinth box plus the end of every hand, at the rail's top. */
const FRAME: [number, number, number][] = [
  [-PAD, -PAD, -PLINTH],
  [W + PAD, -PAD, -PLINTH],
  [W + PAD, DEEP + PAD, -PLINTH],
  [-PAD, DEEP + PAD, -PLINTH],
  [3, HUB_Y, H + 8],
  [HUB_X, 3, H + 8],
  [3, 3, H + 8],
  [HUB_X, HUB_Y, H + 2],
  [END, END, H],
];

const C: Camera = camera(45, 0.5, 1);
frameTo(C, FRAME, 200, 168, 336, 254);
const P: Projector = projector(C);
const front = facing(C);

const plinth = solidGeom(P, front, ...rings(-PAD, -PAD, W + PAD, DEEP + PAD, 8, 1.8), -PLINTH, 0);

interface Leg {
  key: string;
  sil: string;
  outline: Point[];
  from: [number, number];
}

/** A leg is a capsule prism at one height, so nothing it draws reads as a wall. */
function legOf(key: string, ax: number, ay: number, bx: number, by: number): Leg {
  const foot = capsule(ax, ay, bx, by, RAIL, 9);
  const inset = capsuleInset(ax, ay, bx, by, RAIL, 1.7, 9);
  const g = solidGeom(P, front, foot, inset, 0, H);
  return { key, sil: g.sil, outline: g.outline, from: [ax, ay] };
}

/*
 * This camera draws +x down-right and +y down-left, so an arm along -x leaves
 * up-left, one along -y leaves up-right, and one from the far corner comes in
 * from the back. The merged leg runs along +x + y, straight down the screen,
 * towards the viewer. Painted in that order, each nearer thing covers the one
 * behind it.
 */
const legs: Leg[] = [
  legOf('arm-0', 3, HUB_Y, HUB_X, HUB_Y),
  legOf('arm-1', HUB_X, 3, HUB_X, HUB_Y),
  legOf('arm-2', 3, 3, HUB_X, HUB_Y),
  legOf('leg', HUB_X, HUB_Y, END, END),
];

/** The collar at the join: a disc prism, drawn last so it caps all three. */
function disc(r: number, n = 36) {
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return {
      u: HUB_X + Math.cos(a) * r,
      v: HUB_Y + Math.sin(a) * r,
      nu: Math.cos(a),
      nv: Math.sin(a),
    };
  });
}

const collar = solidGeom(P, front, disc(COLLAR), disc(COLLAR - 2.2), 0, H + 2);

const SOURCES = legs.slice(0, 3);
/** One drawn path per source, from its marker to the join. */
const WIRES = SOURCES.map(leg =>
  openPath([P(leg.from[0], leg.from[1], H + 3), P(HUB_X, HUB_Y, H + 3)]),
);
const SOURCE_DOTS = SOURCES.map(leg => P(leg.from[0], leg.from[1], H + 4.5));

/** Draw budget: 900 ms per path, staggered 200 ms, then a reading pause. */
const WIRE_MS = 900;
const STAGGER = 200;
const CYCLE = STAGGER * SOURCES.length + WIRE_MS + 1400;
const easeOut = (v: number) => 1 - (1 - v) ** 3;

/** The collar's punch: three dim dots round one bright centre. */
function punches(at = 0): Item[] {
  const out: Item[] = [];
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * Math.PI * 2) / 3;
    const [cx, cy] = P(HUB_X + Math.cos(a) * 4.6, HUB_Y + Math.sin(a) * 4.6, H + 2.6);
    out.push({
      kind: 'dot',
      key: `punch-${k}`,
      cx,
      cy,
      rx: 1.15 * C.S,
      ry: 1.15 * C.S * C.k,
      tone: 'dot off',
    });
  }
  const [cx, cy] = P(HUB_X, HUB_Y, H + 2.6);
  const breathe = 1 + 0.16 * Math.sin(at / 460);
  out.push({
    kind: 'dot',
    key: 'punch-3',
    cx,
    cy,
    rx: 1.5 * C.S * breathe,
    ry: 1.5 * C.S * C.k * breathe,
    tone: 'dot',
  });
  return out;
}

const LABELS: Record<string, string> = {
  'arm-0': 'first touch',
  'arm-1': 'last touch',
  'arm-2': 'email touch',
  leg: 'paid',
  collar: 'match',
};

const CLOUD: Record<string, string> = {
  'arm-0': 'Google',
  'arm-1': 'Direct',
  'arm-2': 'Email',
  leg: '$249',
  collar: 'Matched',
};

const CLOUD_W = 52;
const CLOUD_H = 22;
const CLOUD_R = 7;
const CLOUD_TAIL = 3.5;
const CLOUD_TIP = 12;
const CLOUD_GAP = 6;

function callout(w: number, h: number, r: number, tail: number, tip: number): string {
  const hw = w / 2;
  const top = -h;
  const rr = Math.min(r, hw, h / 2);
  return [
    `M${r2(-tail)} 0`,
    `L${r2(-hw + rr)} 0`,
    `A${rr} ${rr} 0 0 1 ${r2(-hw)} ${r2(-rr)}`,
    `L${r2(-hw)} ${r2(top + rr)}`,
    `A${rr} ${rr} 0 0 1 ${r2(-hw + rr)} ${r2(top)}`,
    `L${r2(hw - rr)} ${r2(top)}`,
    `A${rr} ${rr} 0 0 1 ${r2(hw)} ${r2(top + rr)}`,
    `L${r2(hw)} ${r2(-rr)}`,
    `A${rr} ${rr} 0 0 1 ${r2(hw - rr)} 0`,
    `L${r2(tail)} 0`,
    `L0 ${r2(tip)}`,
    'Z',
  ].join('');
}

const CLOUD_PATH = callout(CLOUD_W, CLOUD_H, CLOUD_R, CLOUD_TAIL, CLOUD_TIP);

function topOfSilhouette(sil: string) {
  const nums = sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
  let top = Infinity;
  for (let i = 1; i < nums.length; i += 2) top = Math.min(top, Number(nums[i]));
  return top;
}

function centerOfSilhouette(sil: string) {
  const nums = sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    sum += Number(nums[i]);
    count += 1;
  }
  return count ? sum / count : 200;
}

function cloudFor(key: string, sil: string): Item {
  const halfW = CLOUD_W / 2;
  return {
    kind: 'bubble',
    key: 'attribution-cloud',
    path: CLOUD_PATH,
    x: Math.round(clamp(centerOfSilhouette(sil), halfW + 4, 396 - halfW)),
    y: Math.round(topOfSilhouette(sil) - CLOUD_GAP - CLOUD_TIP),
    tx: 0,
    ty: Math.round(-CLOUD_H / 2 + 1),
    text: CLOUD[key] ?? 'rest',
  };
}

/** How long the bright stroke sits on each hand before moving to the next. */
const TOUR = 1400;

let t = 0;
let tour = 0;
let held: string | null = null;
const tourIndex = () => Math.floor(tour / TOUR) % legs.length;

export const attributionRails = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    return key ? (LABELS[key] ?? 'rest') : 'rest';
  },
  watch: () => legs[tourIndex()].key,

  rest(): Item[] {
    // The designed still has every source arrived and every path drawn.
    return build(legs[0].key, CYCLE);
  },

  pick(x: number, y: number): string | null {
    if (contains([x, y], collar.outline)) return 'collar';
    for (let i = legs.length - 1; i >= 0; i--) {
      if (contains([x, y], legs[i].outline)) return legs[i].key;
    }
    return null;
  },

  select(key: string | null) {
    held = key;
  },

  frame(dt: number): Item[] {
    // A held part freezes the whole drawing, not just the tour: the generic
    // stage contract is that holding a part pins every pose for inspection.
    if (held === null) {
      t += dt;
      tour += dt;
    }
    return build(held ?? legs[tourIndex()].key, t % CYCLE);
  },
};

/** One builder keeps the still and every animated frame in the same key order. */
function build(mark: string, phase: number): Item[] {
  const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
  let markSil = collar.sil;
  for (const leg of legs) {
    if (leg.key === mark) markSil = leg.sil;
    items.push({ kind: 'solid', key: leg.key, sil: leg.sil, hi: leg.key === mark });
  }
  SOURCES.forEach((leg, i) => {
    items.push({
      kind: 'wire',
      key: `wire-${leg.key}`,
      d: WIRES[i],
      progress: easeOut(clamp((phase - i * STAGGER) / WIRE_MS, 0, 1)),
      active: leg.key === mark,
    });
  });
  items.push({ kind: 'solid', key: 'collar', sil: collar.sil, hi: held === 'collar' });
  items.push(...punches(t));
  SOURCE_DOTS.forEach(([cx, cy], i) => {
    items.push({
      kind: 'dot',
      key: `source-${i}`,
      cx,
      cy,
      rx: 2.6,
      ry: 1.8,
      tone: phase >= i * STAGGER ? 'dot signal' : 'dot off',
    });
  });
  items.push(cloudFor(mark, markSil));
  return items;
}
