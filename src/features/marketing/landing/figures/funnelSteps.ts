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
 * A funnel as a stair: three terraces, each a solid rising from the plinth to
 * its own height, narrowing as the drop goes on. Beads run along the top of a
 * terrace and spill over its lip onto the next, easing into the ride and
 * accelerating down the face. The bright stroke and cloud callout follow the
 * active step.
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

/** The plinth box plus every terrace top, so framing holds the whole stair. */
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
  y1: number;
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
    y1: y0 + DEEP,
    x0,
    x1,
    z: tier.z,
    outline: g.outline,
    sil: g.sil,
  };
});

let t = 0;
let held: string | null = null;
const holdIndex = () => (held ? tiers.findIndex(s => s.key === held) : -1);

/** How long the bright stroke sits on each step before moving on. */
const TOUR = 1600;
const tourIndex = () => Math.floor(t / TOUR) % tiers.length;

const LABELS = ['step 1 · visits', 'step 2 · trials', 'step 3 · paid'];
const CLOUD = ['Visits 1,284', 'Trials 312', 'Paid 84'];

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
    key: 'funnel-cloud',
    path: CLOUD_PATH,
    x: Math.round(clamp(centerOfSilhouette(sil), halfW + 4, 396 - halfW)),
    y: Math.round(topOfSilhouette(sil) - CLOUD_GAP - CLOUD_TIP),
    tx: 0,
    ty: Math.round(-CLOUD_H / 2 + 1),
    text: CLOUD[index] ?? '',
  };
}

export const funnelSteps = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    return LABELS[Number(key.slice(5))] ?? 'rest';
  },
  watch: () => tiers[tourIndex()].key,

  rest(): Item[] {
    const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
    for (const tier of tiers) {
      items.push({
        kind: 'solid',
        key: tier.key,
        sil: tier.sil,
        hi: tier.key === tiers[0].key,
      });
    }
    items.push(cloudFor(0, tiers[0].sil));
    return items;
  },

  pick(x: number, y: number): string | null {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (contains([x, y], tiers[i].outline)) return tiers[i].key;
    }
    return null;
  },

  select(key: string | null) {
    held = key;
  },

  frame(dt: number): Item[] {
    const hold = holdIndex();
    if (hold < 0) t += dt;
    const focus = hold >= 0 ? hold : tourIndex();
    const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
    tiers.forEach((tier, i) => {
      items.push({
        kind: 'solid',
        key: tier.key,
        sil: tier.sil,
        hi: i === focus,
      });
    });
    items.push(cloudFor(focus, tiers[focus].sil));
    return items;
  },
};
