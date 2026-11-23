/**
 * The isometric core the feature figures are drawn from: a 2:1 camera, rounded
 * rings, and solids built as the hull of two rings with one inner crease.
 *
 * A solid never draws its vertical corners. Its silhouette is the outline of
 * its top and base rings; its crease is the front run of an inset ring, one or
 * two world units inside the silhouette. Bright outside, dim inside.
 */

export interface Camera {
  az: number;
  k: number;
  S: number;
  ox: number;
  oy: number;
}

export type Point = [number, number];
export type Projector = (x: number, y: number, z: number) => Point;

export interface Sample {
  u: number;
  v: number;
  nu: number;
  nv: number;
}

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const camera = (azDeg: number, k: number, S: number): Camera => ({
  az: rad(azDeg),
  k,
  S,
  ox: 0,
  oy: 0,
});

export function projector({ az, k, S, ox, oy }: Camera): Projector {
  const c = Math.cos(az);
  const s = Math.sin(az);
  const zf = Math.sqrt(1 - k * k);
  return (x, y, z) => [ox + S * (x * c - y * s), oy + S * (x * s + y * c) * k - S * z * zf];
}

export function unproject(C: Camera, sx: number, sy: number, z: number): Point {
  const c = Math.cos(C.az);
  const s = Math.sin(C.az);
  const zf = Math.sqrt(1 - C.k * C.k);
  const X = (sx - C.ox) / C.S;
  const Y = ((sy - C.oy) / C.S + z * zf) / C.k;
  return [X * c + Y * s, -X * s + Y * c];
}

/** Centres the projected box of `points` on (cx, cy). It centres only; the scale is chosen per figure. */
export function centerBox(C: Camera, points: [number, number, number][], cx: number, cy: number) {
  C.ox = 0;
  C.oy = 0;
  const P = projector(C);
  let a = Infinity;
  let b = -Infinity;
  let c = Infinity;
  let d = -Infinity;
  for (const [x, y, z] of points) {
    const [sx, sy] = P(x, y, z);
    a = Math.min(a, sx);
    b = Math.max(b, sx);
    c = Math.min(c, sy);
    d = Math.max(d, sy);
  }
  C.ox = cx - (a + b) / 2;
  C.oy = cy - (c + d) / 2;
}

/**
 * Chooses the scale so the projected box of `points` fits inside
 * `maxW` × `maxH`, then centres it. Figures give the extremes of every pose
 * they can reach, so the drawing never leaves the frame at the far end of a
 * motion, and nothing has to be clamped twice.
 */
export function frameTo(
  C: Camera,
  points: [number, number, number][],
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
) {
  C.S = 1;
  centerBox(C, points, 0, 0);
  const P = projector(C);
  let a = Infinity;
  let b = -Infinity;
  let c = Infinity;
  let d = -Infinity;
  for (const [x, y, z] of points) {
    const [sx, sy] = P(x, y, z);
    a = Math.min(a, sx);
    b = Math.max(b, sx);
    c = Math.min(c, sy);
    d = Math.max(d, sy);
  }
  C.S = Math.min(maxW / Math.max(1e-6, b - a), maxH / Math.max(1e-6, d - c));
  centerBox(C, points, cx, cy);
}

export function rrect(u0: number, v0: number, u1: number, v1: number, r: number, n = 4): Sample[] {
  const radius = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const out: Sample[] = [];
  const corners: [number, number, number][] = [
    [u1 - radius, v1 - radius, 0],
    [u0 + radius, v1 - radius, 90],
    [u0 + radius, v0 + radius, 180],
    [u1 - radius, v0 + radius, 270],
  ];
  for (const [cu, cv, a0] of corners) {
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + (90 * k) / n);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      out.push({ u: cu + radius * ca, v: cv + radius * sa, nu: ca, nv: sa });
    }
  }
  return out;
}

/** A stadium ring around the segment a→b, `r` wide, with outward normals. */
export function capsule(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
  n = 7,
): Sample[] {
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / L;
  const uy = dy / L;
  const out: Sample[] = [];
  const push = (cu: number, cv: number, th: number) => {
    const nu = ux * Math.cos(th) - uy * Math.sin(th);
    const nv = uy * Math.cos(th) + ux * Math.sin(th);
    out.push({ u: cu + nu * r, v: cv + nv * r, nu, nv });
  };
  for (let k = 0; k <= n; k++) push(bx, by, Math.PI / 2 - (Math.PI * k) / n);
  for (let k = 0; k <= n; k++) push(ax, ay, -Math.PI / 2 - (Math.PI * k) / n);
  return out;
}

/** A capsule pulled in by `b` on every side, for a rail's crease. */
export function capsuleInset(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
  b: number,
  n = 7,
): Sample[] {
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / L;
  const uy = dy / L;
  return capsule(ax + ux * b, ay + uy * b, bx - ux * b, by - uy * b, Math.max(0.4, r - b), n);
}

/** Turns a plan ring about its own centre, normals included, and moves it to [cx, cy]. */
export function oriented(ring: Sample[], cx: number, cy: number, angle: number): Sample[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return ring.map(q => ({
    u: cx + q.u * c - q.v * s,
    v: cy + q.u * s + q.v * c,
    nu: q.nu * c - q.nv * s,
    nv: q.nu * s + q.nv * c,
  }));
}

export const ringAt = (P: Projector, ring: Sample[], z: number): Point[] =>
  ring.map(q => P(q.u, q.v, z));

/** The one cyclic run of samples that pass `keep`, or nothing when none do. */
export function run(ring: Sample[], keep: (q: Sample) => boolean): Sample[] {
  const n = ring.length;
  let start = -1;
  for (let i = 0; i < n; i++) {
    if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
      start = i;
      break;
    }
  }
  if (start < 0) return keep(ring[0]) ? ring.slice() : [];
  const out: Sample[] = [];
  for (let k = 0; k < n && keep(ring[(start + k) % n]); k++) out.push(ring[(start + k) % n]);
  return out;
}

export function hull(input: Point[]): Point[] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  const upper: Point[] = [];
  for (const p of pts) {
    while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export const poly = (pts: Point[]) => `M${pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`;

export const openPath = (pts: Point[]) =>
  pts.length < 2 ? '' : `M${pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L')}`;

export interface SolidGeom {
  /** The outer outline: the hull of the top and base rings, and nothing else. */
  sil: string;
  /** The one dim line inside it: the front run of the inset ring. */
  crease: string;
  /** The same outline as points, for a hit test against the rest pose. */
  outline: Point[];
}

export function solidGeom(
  P: Projector,
  front: (q: Sample) => boolean,
  ring: Sample[],
  inner: Sample[],
  z0: number,
  z1: number,
): SolidGeom {
  const outline = hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)));
  return {
    sil: poly(outline),
    crease: inner.length ? openPath(ringAt(P, run(inner, front), z1)) : '',
    outline,
  };
}

export const rings = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  b: number,
): [Sample[], Sample[]] => [
  rrect(x0, y0, x1, y1, r),
  rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b)),
];

/** Whether a screen point is inside a polygon, by the even-odd rule. */
export function contains(p: Point, shape: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, yi] = shape[i];
    const [xj, yj] = shape[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** The distance from a screen point to a segment, for a hit test on a rail or a wire. */
/** The sample that faces the camera least: used to pick where a dashed drop falls. */
export const facing = (C: Camera) => {
  const s = Math.sin(C.az);
  const c = Math.cos(C.az);
  return (q: Sample) => q.nu * s + q.nv * c >= -1e-6;
};

export const bbox = (pts: Point[]) => {
  let a = Infinity;
  let b = -Infinity;
  let c = Infinity;
  let d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.max(b, x);
    c = Math.min(c, y);
    d = Math.max(d, y);
  }
  return { x0: a, x1: b, y0: c, y1: d };
};
