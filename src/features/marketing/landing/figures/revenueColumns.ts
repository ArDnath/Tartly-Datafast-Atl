import type { Camera, Projector, Sample } from './iso';
import { camera, clamp, contains, facing, frameTo, projector, r2, rings, solidGeom } from './iso';
import type { Item } from './types';

/**
 * Twelve columns on a low plinth, read as a bar chart you could walk around.
 * A travelling swell runs along the row and never stops. The bright stroke
 * tours the row in a slow loop, naming each column's revenue as it passes, and
 * a cloud callout carries that column's dollars just above the bar, its arrow
 * pointing down at the bar's crown. Point at a column and the swell settles
 * towards it and the read-out holds that column's dollars, so a hand on the row
 * holds the reading still.
 */

const N = 12;
const CELL = 16.3;
const FOOT = 13.8;
const DEPTH = 21;
const PLINTH = 6.5;
const FLOOR = 22;
const WAVE = 9;
const SPEED = 0.00052;
const FALL = 2.6;

/** A low floor with three rises: the row is a composition, not a ramp. */
const HEIGHTS = [30, 38, 33, 62, 78, 66, 44, 70, 92, 58, 48, 74];

/** Bar height and revenue share one scale, so the read-out matches the drawing. */
const revenueOf = (i: number) => Math.round(HEIGHTS[i] * 68);
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const W = N * CELL;
const PAD = 6;

/**
 * Every world point any pose can reach: the plinth box, and every column at
 * the top of its swell. Framing against the whole envelope keeps the drawing
 * in the frame at the far end of the motion.
 */
const FRAME: [number, number, number][] = [
  [-PAD, -PAD, -PLINTH],
  [W + PAD, -PAD, -PLINTH],
  [W + PAD, DEPTH + PAD, -PLINTH],
  [-PAD, DEPTH + PAD, -PLINTH],
  ...HEIGHTS.map((h, i): [number, number, number] => {
    const x0 = i * CELL + (CELL - FOOT) / 2;
    const y0 = (DEPTH - FOOT) / 2;
    return [x0 + FOOT / 2, y0 + FOOT / 2, h + WAVE];
  }),
];

const C: Camera = camera(45, 0.5, 1);
frameTo(C, FRAME, 200, 170, 336, 252);
const P: Projector = projector(C);
const front = facing(C);

const plinth = solidGeom(P, front, ...rings(-PAD, -PAD, W + PAD, DEPTH + PAD, 9, 2), -PLINTH, 0);

interface Column {
  key: string;
  ring: Sample[];
  inner: Sample[];
  cx: number;
  cy: number;
  h: number;
  outline: [number, number][];
  sil: string;
  crease: string;
}

const columns: Column[] = HEIGHTS.map((h, i) => {
  const x0 = i * CELL + (CELL - FOOT) / 2;
  const y0 = (DEPTH - FOOT) / 2;
  const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 3.6, 1.2);
  const g = solidGeom(P, front, ring, inner, 0, h);
  return {
    key: `col-${i}`,
    ring,
    inner,
    cx: x0 + FOOT / 2,
    cy: y0 + FOOT / 2,
    h,
    outline: g.outline,
    sil: g.sil,
    crease: g.crease,
  };
});

/**
 * The callout outline, drawn once around its own origin: a scalloped cloud body
 * whose base runs out into one straight-sided arrow.
 *
 * The bumps sit on an ellipse and are joined by arcs sized as a fraction of each
 * chord, so the whole thing is a single continuous line — no free-standing
 * puffs. The base is left open between -half and +half and those two points run
 * down to one point at `tip`, so the tail reads as a pointer rather than a bead.
 *
 * Fixed extents, which the anchoring and the tests rely on:
 *   body top = -ry, base = ry * 0.86, arrow point = +tip.
 */
const CLOUD_RX = 27;
const CLOUD_RY = 10.5;
const CLOUD_HALF = 4;
const CLOUD_TIP = 16;
/** Clearance between the arrow's point and the crown of the bar it names. */
const CLOUD_GAP = 7;

function thoughtCloud(rx: number, ry: number, half: number, tip: number): string {
  const bumps = 9;
  const bulge = 0.6;
  const base = ry * 0.86;
  const pts: [number, number][] = [];
  for (let i = 0; i < bumps; i += 1) {
    const a = -Math.PI / 2 + (i / bumps) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }

  // Start at the left edge of the base gap and run clockwise, so the base stays
  // open for the tail instead of closing underneath it.
  const start = pts.findIndex(p => p[0] < 0 && p[1] > 0);
  let d = `M${r2(-half)} ${r2(base)}L${r2(pts[start][0])} ${r2(pts[start][1])}`;
  for (let k = 1; k < bumps; k += 1) {
    const [x0, y0] = pts[(start + k - 1) % bumps];
    const [x1, y1] = pts[(start + k) % bumps];
    const r = r2(Math.hypot(x1 - x0, y1 - y0) * bulge);
    d += `A${r} ${r} 0 0 1 ${r2(x1)} ${r2(y1)}`;
  }

  return `${d}L${r2(half)} ${r2(base)}L0 ${r2(tip)}Z`;
}

const CLOUD = thoughtCloud(CLOUD_RX, CLOUD_RY, CLOUD_HALF, CLOUD_TIP);

/** The topmost screen y of a silhouette, read back off its path data. */
function topOfSilhouette(sil: string) {
  const nums = sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
  let top = Infinity;
  for (let i = 1; i < nums.length; i += 2) top = Math.min(top, Number(nums[i]));
  return top;
}

/**
 * The callout that rides the tour: the dollars of the column it is over, with
 * its arrow stopped a constant gap above that column's own crown.
 *
 * Anchoring to the silhouette rather than to a fixed offset is what keeps the
 * arrow pointing at the bar as the swell lifts and drops it. The previous
 * version offset 42 px from the cap centre and clamped the result into
 * [46, 284], which parked the callout on top of every tall column.
 */
function revenueCloud(i: number, sil: string): Item {
  const col = columns[i];
  const [sx] = P(col.cx, col.cy, 0);
  return {
    kind: 'bubble',
    key: 'revenue-cloud',
    path: CLOUD,
    x: Math.round(clamp(sx, CLOUD_RX + 4, 396 - CLOUD_RX)),
    y: Math.round(topOfSilhouette(sil) - CLOUD_GAP - CLOUD_TIP),
    text: money(revenueOf(i)),
  };
}

/** A travelling swell with one slower harmonic, so the row never reads as a metronome. */
function swell(i: number, t: number, hold: number) {
  const phase = i * 0.44 - t * SPEED;
  const v = Math.sin(phase) * 0.7 + Math.sin(phase * 0.57 + 1.6) * 0.3;
  if (hold < 0) return v;
  return v * clamp((Math.abs(i - hold) - 0.5) / FALL, 0, 1);
}

const heightOf = (i: number, t: number, hold: number) =>
  Math.max(FLOOR, columns[i].h + swell(i, t, hold) * WAVE);

/** How long the bright stroke spends on each column before moving on. */
const TOUR = 1000;

let t = 0;
let tour = 0;
let held: string | null = null;
const holdIndex = () => (held ? columns.findIndex(c => c.key === held) : -1);
const tourIndex = () => Math.floor(tour / TOUR) % N;

export const revenueColumns = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    return `revenue ${money(revenueOf(Number(key.slice(4))))}`;
  },
  watch: () => columns[tourIndex()].key,

  rest(): Item[] {
    const items: Item[] = [
      { kind: 'solid', key: 'plinth', sil: plinth.sil, crease: plinth.crease },
    ];
    for (const col of columns) {
      items.push({
        kind: 'solid',
        key: col.key,
        sil: col.sil,
        crease: col.crease,
        hi: col.key === columns[0].key,
      });
    }
    items.push(revenueCloud(0, columns[0].sil));
    return items;
  },

  pick(x: number, y: number): string | null {
    for (let i = N - 1; i >= 0; i--) {
      if (contains([x, y], columns[i].outline)) return columns[i].key;
    }
    return null;
  },

  select(key: string | null) {
    held = key;
  },

  frame(dt: number): Item[] {
    t += dt;
    const hold = holdIndex();
    if (hold < 0) tour += dt;
    const mark = hold >= 0 ? hold : tourIndex();
    const items: Item[] = [
      { kind: 'solid', key: 'plinth', sil: plinth.sil, crease: plinth.crease },
    ];
    let markSil = columns[mark].sil;
    for (let i = 0; i < N; i++) {
      const col = columns[i];
      const h = heightOf(i, t, hold);
      const g = solidGeom(P, front, col.ring, col.inner, 0, h);
      if (i === mark) markSil = g.sil;
      items.push({
        kind: 'solid',
        key: col.key,
        sil: g.sil,
        crease: g.crease,
        hi: i === mark,
      });
    }
    items.push(revenueCloud(mark, markSil));
    return items;
  },
};
