import type { Camera, Projector, Sample } from './iso';
import { camera, clamp, contains, facing, frameTo, projector, r2, rings, solidGeom } from './iso';
import type { Item } from './types';

/**
 * Twelve columns on a low plinth, read as a bar chart you could walk around.
 * A travelling swell runs along the row and never stops. Point at a column and
 * the swell settles towards it; the bright stroke and the cloud callout follow,
 * carrying that column's dollars just above the bar's crown.
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
  };
});

/**
 * Rounded rectangular callout, centred horizontally around its origin with the
 * body above y=0 and a small pointer dropping below it. The pointer tip sits at
 * `tipY`, which is what we anchor a fixed gap above the highlighted bar.
 */
const CLOUD_W = 56;
const CLOUD_H = 24;
const CLOUD_R = 8;
const CLOUD_TAIL = 4;
const CLOUD_TIP = 14;
/** Clearance between the pointer tip and the crown of the bar it names. */
const CLOUD_GAP = 7;

function callout(w: number, h: number, r: number, tail: number, tip: number): string {
  const hw = w / 2;
  const top = -h;
  const right = hw;
  const left = -hw;
  const rr = Math.min(r, hw, h / 2);
  return [
    `M${r2(-tail)} 0`,
    `L${r2(left + rr)} 0`,
    `A${rr} ${rr} 0 0 1 ${r2(left)} ${r2(-rr)}`,
    `L${r2(left)} ${r2(top + rr)}`,
    `A${rr} ${rr} 0 0 1 ${r2(left + rr)} ${r2(top)}`,
    `L${r2(right - rr)} ${r2(top)}`,
    `A${rr} ${rr} 0 0 1 ${r2(right)} ${r2(top + rr)}`,
    `L${r2(right)} ${r2(-rr)}`,
    `A${rr} ${rr} 0 0 1 ${r2(right - rr)} 0`,
    `L${r2(tail)} 0`,
    `L0 ${r2(tip)}`,
    'Z',
  ].join('');
}

const CLOUD = callout(CLOUD_W, CLOUD_H, CLOUD_R, CLOUD_TAIL, CLOUD_TIP);

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
  const halfW = CLOUD_W / 2;
  const top = topOfSilhouette(sil);
  const minY = CLOUD_H + 1;
  const bottomLimit = Math.max(minY, Math.floor(top - CLOUD_TIP));
  const y = clamp(Math.floor(top - CLOUD_GAP - CLOUD_TIP), minY, bottomLimit);
  return {
    kind: 'bubble',
    key: 'revenue-cloud',
    path: CLOUD,
    x: Math.round(clamp(sx, halfW + 4, 396 - halfW)),
    y,
    tx: 0,
    ty: Math.round(-CLOUD_H / 2 + 1),
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

let t = 0;
let held: string | null = null;
const holdIndex = () => (held ? columns.findIndex(c => c.key === held) : -1);

const peakAt = (at: number, hold: number) => {
  if (hold >= 0) return hold;
  let best = 0;
  let bestValue = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const value = swell(i, at, -1);
    if (value > bestValue) {
      best = i;
      bestValue = value;
    }
  }
  return best;
};

export const revenueColumns = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    return `revenue ${money(revenueOf(Number(key.slice(4))))}`;
  },
  watch: () => columns[peakAt(t, holdIndex())].key,

  rest(): Item[] {
    const peak = peakAt(0, -1);
    const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
    let peakSil = columns[peak].sil;
    for (let i = 0; i < N; i += 1) {
      const col = columns[i];
      const h = heightOf(i, 0, -1);
      const g = solidGeom(P, front, col.ring, col.inner, 0, h);
      if (i === peak) peakSil = g.sil;
      items.push({
        kind: 'solid',
        key: col.key,
        sil: g.sil,
        hi: i === peak,
      });
    }
    items.push(revenueCloud(peak, peakSil));
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
    const mark = peakAt(t, hold);
    const items: Item[] = [{ kind: 'solid', key: 'plinth', sil: plinth.sil }];
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
        hi: i === mark,
      });
    }
    items.push(revenueCloud(mark, markSil));
    return items;
  },
};
