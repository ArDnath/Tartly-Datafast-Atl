import type { Camera, Point, Projector, Sample } from './iso';
import {
  camera,
  clamp,
  contains,
  facing,
  frameTo,
  lerp,
  openPath,
  projector,
  r2,
  rings,
  solidGeom,
} from './iso';
import type { Item } from './types';

/**
 * Stage 01 — traffic, meet revenue.
 *
 * A thin isometric platform. A visitor comes in at the far-left source, follows
 * a short path across the slab, and the line to the payment marker draws behind
 * it. Once the visitor arrives, the `$249` tooltip springs into view above the
 * payment. Nothing loops faster than a reader can follow: the whole tour is a
 * little over four seconds, with the connection itself drawing in 900 ms.
 */

const PLINTH = 4;
const PAD = 8;
const SOURCE_H = 7;
const PAY_H = 12;

const SOURCE: Point = [2, 58];
const PAYMENT: Point = [98, 4];

/** Motion budget from the design spec, in milliseconds. */
const WIRE_MS = 900;
const VISITOR_MS = 1600;
const TOOLTIP_MS = 350;
const CYCLE = 4200;

const FRAME: [number, number, number][] = [
  [-PAD, -PAD, -PLINTH],
  [106 + PAD, -PAD, -PLINTH],
  [106 + PAD, 66 + PAD, -PLINTH],
  [-PAD, 66 + PAD, -PLINTH],
  [SOURCE[0], SOURCE[1], SOURCE_H + 8],
  [PAYMENT[0], PAYMENT[1], PAY_H + 8],
  [50, 31, 10],
];

const C: Camera = camera(45, 0.5, 1);
frameTo(C, FRAME, 200, 170, 318, 216);
const P: Projector = projector(C);
const front = facing(C);

/** A round isometric marker: a disc prism with a smaller inner ring. */
function disc(cx: number, cy: number, r: number, n = 32): Sample[] {
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return {
      u: cx + Math.cos(a) * r,
      v: cy + Math.sin(a) * r,
      nu: Math.cos(a),
      nv: Math.sin(a),
    };
  });
}

const platform = solidGeom(P, front, ...rings(-6, -6, 106, 66, 5, 1.4), -PLINTH, 0);
const source = solidGeom(
  P,
  front,
  disc(SOURCE[0], SOURCE[1], 5),
  disc(SOURCE[0], SOURCE[1], 3.2),
  0,
  SOURCE_H,
);
const payment = solidGeom(
  P,
  front,
  disc(PAYMENT[0], PAYMENT[1], 6),
  disc(PAYMENT[0], PAYMENT[1], 4),
  0,
  PAY_H,
);

/** The route is a two-segment wire so it reads as a journey, not a ruler. */
const ROUTE: Point[] = [
  P(SOURCE[0], SOURCE[1], SOURCE_H + 1),
  P(50, 31, 8),
  P(PAYMENT[0], PAYMENT[1], PAY_H + 1),
];
const ROUTE_D = ROUTE.slice(1).map((point, i) =>
  Math.hypot(point[0] - ROUTE[i][0], point[1] - ROUTE[i][1]),
);
const ROUTE_LEN = ROUTE_D.reduce((a, b) => a + b, 0);

/** Even-speed travel along the polyline, then a smooth ease on the whole ride. */
function along(t: number): Point {
  let distance = clamp(t, 0, 1) * ROUTE_LEN;
  for (let i = 0; i < ROUTE_D.length; i += 1) {
    if (distance <= ROUTE_D[i] || i === ROUTE_D.length - 1) {
      const part = ROUTE_D[i] > 0 ? clamp(distance / ROUTE_D[i], 0, 1) : 0;
      return [lerp(ROUTE[i][0], ROUTE[i + 1][0], part), lerp(ROUTE[i][1], ROUTE[i + 1][1], part)];
    }
    distance -= ROUTE_D[i];
  }
  return ROUTE[ROUTE.length - 1];
}

const CLOUD_W = 56;
const CLOUD_H = 24;
const CLOUD_R = 8;
const CLOUD_TAIL = 4;
const CLOUD_TIP = 14;

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

const CLOUD = callout(CLOUD_W, CLOUD_H, CLOUD_R, CLOUD_TAIL, CLOUD_TIP);

function topOfSilhouette(sil: string) {
  const nums = sil.match(/-?\d+(?:\.\d+)?/g) ?? [];
  let top = Infinity;
  for (let i = 1; i < nums.length; i += 2) top = Math.min(top, Number(nums[i]));
  return top;
}

function tooltip(scale: number, phase: number): Item {
  const [sx] = P(PAYMENT[0], PAYMENT[1], 0);
  // A sub-pixel hover keeps the finished state alive without a second loop.
  const float = Math.sin(phase / 520) * 1.2;
  return {
    kind: 'bubble',
    key: 'amount',
    path: CLOUD,
    x: Math.round(clamp(sx, CLOUD_W / 2 + 10, 400 - CLOUD_W / 2 - 10)),
    y: Math.round(clamp(topOfSilhouette(payment.sil) - 8 - CLOUD_TIP + float, CLOUD_H + 10, 296)),
    tx: 0,
    ty: Math.round(-CLOUD_H / 2 + 1),
    text: '$249',
    scale,
  };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
/** A restrained overshoot, so the payment marker feels tactile rather than bouncy. */
const easeOutBack = (t: number) => {
  const c1 = 1.2;
  return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

let t = 0;
let held: string | null = null;

function pose(phase: number): Item[] {
  const wire = easeOut(clamp(phase / WIRE_MS, 0, 1));
  const ride = easeInOut(clamp(phase / VISITOR_MS, 0, 1));
  const scale = easeOutBack(clamp((phase - VISITOR_MS) / TOOLTIP_MS, 0, 1));
  const [vx, vy] = along(ride);
  const sourceOn = held ? held === 'source' : phase < WIRE_MS;
  const paymentOn = held ? held === 'payment' : !sourceOn;

  return [
    { kind: 'solid', key: 'plinth', sil: platform.sil },
    { kind: 'solid', key: 'source', sil: source.sil, hi: sourceOn },
    {
      kind: 'wire',
      key: 'route',
      d: openPath(ROUTE),
      progress: wire,
      active: held === 'route' || phase >= WIRE_MS,
    },
    { kind: 'solid', key: 'payment', sil: payment.sil, hi: paymentOn },
    {
      kind: 'dot',
      key: 'entry',
      cx: ROUTE[0][0],
      cy: ROUTE[0][1],
      rx: 3.2,
      ry: 2.2,
      tone: 'dot signal',
    },
    { kind: 'dot', key: 'visitor', cx: r2(vx), cy: r2(vy), rx: 3.8, ry: 2.6, tone: 'dot' },
    tooltip(scale, phase),
  ];
}

export const trafficRevenue = {
  view: '0 0 400 320',
  caption: 'rest',
  label(key: string | null) {
    if (!key) return 'rest';
    if (key === 'source') return 'traffic source';
    if (key === 'route') return 'anonymous visit';
    if (key === 'payment') return 'payment $249';
    if (key === 'visitor') return 'visitor in motion';
    if (key === 'amount') return '$249 attributed';
    if (key === 'plinth') return 'attribution platform';
    return 'entry point';
  },
  watch: () => (t % CYCLE < WIRE_MS ? 'source' : 'payment'),

  rest(): Item[] {
    return pose(0).map(item => {
      if (item.kind === 'wire') return { ...item, progress: 1, active: true };
      if (item.kind === 'bubble') return { ...item, scale: 1 };
      if (item.key === 'visitor') {
        const [x, y] = along(1);
        return { ...item, cx: r2(x), cy: r2(y) };
      }
      return item;
    });
  },

  pick(x: number, y: number): string | null {
    const point: Point = [x, y];
    if (contains(point, payment.outline)) return 'payment';
    if (contains(point, source.outline)) return 'source';
    if (contains(point, platform.outline)) return 'platform';
    return null;
  },

  select(key: string | null) {
    held = key;
  },

  frame(dt: number): Item[] {
    // Holding a part pins the drawing so a reader can inspect one moment.
    if (held === null) t += dt;
    return pose(t % CYCLE);
  },
};
