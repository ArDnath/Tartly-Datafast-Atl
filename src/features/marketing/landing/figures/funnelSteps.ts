import type { Camera, Point, Projector } from './iso';
import { camera, clamp, contains, facing, frameTo, lerp, projector, rings, solidGeom } from './iso';
import type { Item } from './types';

/**
 * A funnel as a stair: three terraces, each a solid rising from the plinth to
 * its own height, narrowing as the drop goes on. Beads run along the top of a
 * terrace and spill over its lip onto the next, easing into the ride and
 * accelerating down the face, so the falling traffic is the subject and keeps
 * going. The bright stroke tours the terraces and names each step. Hovering a
 * terrace holds the spill and names it too.
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
  crease: string;
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
    crease: g.crease,
  };
});

/** Beads ease into the ride, then fall under gravity down the face. */
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = (x: number) => x * x;

interface Bead {
  cx: number;
  cy: number;
  /** Vertical stretch while falling: squash and stretch, the oldest trick. */
  stretch: number;
}

/**
 * A bead at stage `u` in 0..3: it glides along the top of terrace i from its
 * back to its lip, arcs a little over the surface, then accelerates down the
 * face to the next terrace. The ride is long, the hop is short, so a bead
 * reads as traffic finding the drop.
 */
function beadAt(u: number): Bead {
  const last = tiers.length - 1;
  const i = clamp(Math.floor(u), 0, last);
  const f = clamp(u - i, 0, 1);
  const a = tiers[i];
  const b = tiers[Math.min(i + 1, last)];
  const ride = 0.62;

  if (f < ride) {
    const k = easeInOut(f / ride);
    const x = lerp(a.x0 + 10, a.x1 - 10, k * 0.42);
    const y = lerp(a.y0 + 5, a.y1 + 1, k);
    const z = a.z + 1.7 + Math.sin(k * Math.PI) * 0.9;
    const [cx, cy] = P(x, y, z);
    return { cx, cy, stretch: 1 };
  }

  const k = easeIn((f - ride) / (1 - ride));
  const x = lerp(lerp(a.x0 + 10, a.x1 - 10, 0.42), b.x0 + 10, k);
  const y = lerp(a.y1 + 1, b.y0 + 5, k);
  const z = lerp(a.z + 1.7, b.z + 1.7, k);
  const [cx, cy] = P(x, y, z);
  return { cx, cy, stretch: 1 + 0.34 * k };
}

const BEADS = 6;
const PERIOD = 3000;

let t = 0;
let held: string | null = null;
const holdIndex = () => (held ? tiers.findIndex(s => s.key === held) : -1);

/** The beads at clock `at`. Rest and every frame share it, so their keys match. */
function beads(at: number, bright = false): Item[] {
  return Array.from({ length: BEADS }, (_, b) => {
    const u = ((at / PERIOD + b / BEADS) % 1) * tiers.length;
    const bead = beadAt(u);
    const lead = bright && b === 0;
    const base = (lead ? 3.3 : 2.9) * (1 + 0.05 * Math.sin(at / 320 + b * 1.3));
    const { stretch } = bead;
    return {
      kind: 'dot' as const,
      key: `bead-${b}`,
      cx: bead.cx,
      cy: bead.cy,
      rx: (base / Math.sqrt(stretch)) * C.S,
      ry: base * C.S * C.k * stretch,
      tone: lead ? ('dot' as const) : ('dot m' as const),
    };
  });
}

/** How long the bright stroke sits on each step before moving on. */
const TOUR = 1600;
const tourIndex = () => Math.floor(t / TOUR) % tiers.length;

const LABELS = ['step 1 · visits', 'step 2 · trials', 'step 3 · paid'];

export const funnelSteps = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    return LABELS[Number(key.slice(5))] ?? 'rest';
  },
  watch: () => tiers[tourIndex()].key,

  rest(): Item[] {
    const items: Item[] = [
      { kind: 'solid', key: 'plinth', sil: plinth.sil, crease: plinth.crease },
    ];
    for (const tier of tiers) {
      items.push({
        kind: 'solid',
        key: tier.key,
        sil: tier.sil,
        crease: tier.crease,
        hi: tier.key === tiers[0].key,
      });
    }
    items.push(...beads(0, true));
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
    const items: Item[] = [
      { kind: 'solid', key: 'plinth', sil: plinth.sil, crease: plinth.crease },
    ];
    tiers.forEach((tier, i) => {
      items.push({
        kind: 'solid',
        key: tier.key,
        sil: tier.sil,
        crease: tier.crease,
        hi: i === focus,
      });
    });
    items.push(...beads(t, hold < 0));
    return items;
  },
};
