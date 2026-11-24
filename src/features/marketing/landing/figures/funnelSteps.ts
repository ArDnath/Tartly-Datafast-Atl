import type { Camera, Point, Projector } from './iso';
import {
  camera,
  clamp,
  contains,
  facing,
  frameTo,
  lerp,
  projector,
  r2,
  rings,
  solidGeom,
} from './iso';
import type { Item } from './types';

/**
 * Stage 03 — see where they drop.
 *
 * Three isometric terraces: signup, trial, paid. Visitor markers enter together
 * and move down the funnel in 1.6 s stages; two fall away at the intermediate
 * layers, while one reaches the paid layer, which lights up orange. The floating
 * count reports the layer under attention.
 */

const W0 = 120;
const DEEP = 30;
const GAP = 7;
const PLINTH = 7;
const PAD = 7;

/** Width and top height of each terrace, back to front. */
const TIERS = [
  { w: W0, z: 64 },
  { w: W0 * 0.66, z: 42 },
  { w: W0 * 0.36, z: 20 },
];

const DEPTH = TIERS.length * (DEEP + GAP) - GAP;

const FRAME: [number, number, number][] = [
  [-PAD, -PAD, -PLINTH],
  [W0 + PAD, -PAD, -PLINTH],
  [W0 + PAD, DEPTH + PAD, -PLINTH],
  [-PAD, DEPTH + PAD, -PLINTH],
  ...TIERS.map((tier, i): [number, number, number] => [
    W0 / 2,
    i * (DEEP + GAP) + DEEP / 2,
    tier.z,
  ]),
];

const C: Camera = camera(45, 0.5, 1);
frameTo(C, FRAME, 200, 168, 340, 256);
const P: Projector = projector(C);
const front = facing(C);

const plinth = solidGeom(P, front, ...rings(-PAD, -PAD, W0 + PAD, DEPTH + PAD, 9, 2), -PLINTH, 0);

interface Tier {
  key: string;
  y0: number;
  x0: number;
  x1: number;
  z: number;
  outline: Point[];
  sil: string;
}

const tiers: Tier[] = TIERS.map((tier, i) => {
  const x0 = (W0 - tier.w) / 2;
  const x1 = x0 + tier.w;
  const y0 = i * (DEEP + GAP);
  const [ring, inner] = rings(x0, y0, x1, y0 + DEEP, 6, 1.8);
  const g = solidGeom(P, front, ring, inner, 0, tier.z);
  return {
    key: `step-${i}`,
    y0,
    x0,
    x1,
    z: tier.z,
    outline: g.outline,
    sil: g.sil,
  };
});

/** Where a marker stands on each terrace. */
const tierTop = (i: number): Point => P(W0 / 2, tiers[i].y0 + DEEP / 2, tiers[i].z + 1);

/**
 * One marker reaches the end; the other two leave at trial and signup. Their
 * stagger is the 200 ms layer rhythm from the spec, applied as a small head
 * start instead of three separate clocks.
 */
const MARKERS = [
  { key: 'visitor-0', last: 2 },
  { key: 'visitor-1', last: 1 },
  { key: 'visitor-2', last: 0 },
];
const MARKER_MS = 1600;
const LAYER_STAGGER = 200;
const CYCLE = 4800;

const LABELS = ['step 1 · signup', 'step 2 · trial', 'step 3 · paid'];
const CLOUD = ['Signup 1,284', 'Trial 312', 'Paid 84'];

const CLOUD_W = 74;
const CLOUD_H = 20;
const CLOUD_R = 6;
const CLOUD_TAIL = 3;
const CLOUD_TIP = 11;
const CLOUD_GAP = 5;

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

function cloudFor(index: number, sil: string): Item {
  const halfW = CLOUD_W / 2;
  return {
    kind: 'bubble',
    key: 'count',
    path: CLOUD_PATH,
    x: Math.round(clamp(centerOfSilhouette(sil), halfW + 4, 396 - halfW)),
    y: Math.round(topOfSilhouette(sil) - CLOUD_GAP - CLOUD_TIP),
    tx: 0,
    ty: Math.round(-CLOUD_H / 2 + 1),
    text: CLOUD[index],
  };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

let t = 0;
let held: string | null = null;
const holdIndex = () => (held ? tiers.findIndex(s => s.key === held) : -1);
const stepAt = (phase: number) => Math.min(2, Math.floor(phase / MARKER_MS));

function build(focus: number, phase: number): Item[] {
  const lit = holdIndex() >= 0 ? holdIndex() : focus;
  const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
  tiers.forEach((tier, i) => {
    items.push({ kind: 'solid', key: tier.key, sil: tier.sil, hi: i === lit });
  });

  MARKERS.forEach((marker, i) => {
    // The whole ride spans the cycle; each marker starts 200 ms after the last.
    const local = clamp((phase - i * LAYER_STAGGER) / (CYCLE - 2 * LAYER_STAGGER), 0, 1);
    const step = Math.min(2, Math.floor(local * 3));
    const within = clamp(local * 3 - step, 0, 1);
    const from = tierTop(step);
    const to = tierTop(Math.min(2, step + 1));
    const eased = easeInOut(within);
    const dropped = step > marker.last;
    items.push({
      kind: 'dot',
      key: marker.key,
      cx: r2(lerp(from[0], to[0], eased)),
      cy: r2(lerp(from[1], to[1], eased)),
      rx: 2.9,
      ry: 2,
      tone: dropped ? 'dot off' : i === 0 && step === 2 ? 'dot' : 'dot m',
    });
  });

  items.push(cloudFor(lit, tiers[lit].sil));
  return items;
}

export const funnelSteps = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    const index = tiers.findIndex(tier => tier.key === key);
    if (index >= 0) return LABELS[index];
    if (key === 'visitor-0') return 'reached paid';
    if (key === 'visitor-1') return 'dropped at trial';
    if (key === 'visitor-2') return 'dropped at signup';
    return 'conversion count';
  },
  watch: () => tiers[holdIndex() >= 0 ? holdIndex() : stepAt(t % CYCLE)].key,

  rest(): Item[] {
    // The still shows the finished journey: one visitor on paid, two faded out,
    // and the paid terrace carrying the conversion count.
    return build(2, CYCLE);
  },

  pick(x: number, y: number): string | null {
    const point: Point = [x, y];
    for (let i = tiers.length - 1; i >= 0; i -= 1) {
      if (contains(point, tiers[i].outline)) return tiers[i].key;
    }
    return null;
  },

  select(key: string | null) {
    held = key;
  },

  frame(dt: number): Item[] {
    if (held === null) t += dt;
    const phase = t % CYCLE;
    return build(stepAt(phase), phase);
  },
};
