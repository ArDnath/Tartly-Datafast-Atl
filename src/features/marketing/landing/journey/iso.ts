/**
 * Geometry for the Revenue Journey drawings.
 *
 * Every scene is a hand-authored 2.5D illustration rather than a perspective
 * camera: the shapes are projected once, as paths, so the browser only has to
 * paint (and occasionally animate) them. That keeps the section static in the
 * server HTML and cheap on low-end devices.
 */

export type Point = [number, number];

const round = (value: number) => Math.round(value * 100) / 100;
const pair = ([x, y]: Point) => `${round(x)} ${round(y)}`;

/** A point `distance` along the segment from `from` towards `to`. */
function toward(from: Point, to: Point, distance: number): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
}

/**
 * A rounded diamond, as seen in a 2:1 isometric view. The four corners are
 * softened with a quadratic join; the side length decides the usable radius so
 * a small marker can reuse the same helper without folding in on itself.
 */
export function roundedDiamond(
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  radius = 14,
): string {
  const points: Point[] = [
    [cx, cy - halfHeight],
    [cx + halfWidth, cy],
    [cx, cy + halfHeight],
    [cx - halfWidth, cy],
  ];
  const maxRadius = Math.min(halfWidth, halfHeight) * 0.45;
  const r = Math.max(0, Math.min(radius, maxRadius));

  let path = '';
  for (let index = 0; index < points.length; index += 1) {
    const vertex = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const start = toward(vertex, previous, r);
    const end = toward(vertex, next, r);

    if (index === 0) {
      path += `M${pair(end)}`;
    } else {
      path += `L${pair(start)}`;
    }
    path += `Q${pair(vertex)} ${pair(end)}`;
  }
  return `${path}Z`;
}

/**
 * A speech-bubble path: rounded rectangle with a short pointer at the bottom
 * centre. Used by every money/count callout so the three scenes share one shape.
 */
export function callout(
  cx: number,
  top: number,
  width: number,
  height: number,
  radius = 10,
  tail = 10,
): string {
  const x0 = cx - width / 2;
  const x1 = cx + width / 2;
  const y0 = top;
  const y1 = top + height;
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M${round(x0 + r)} ${round(y0)}`,
    `L${round(x1 - r)} ${round(y0)}`,
    `Q${round(x1)} ${round(y0)} ${round(x1)} ${round(y0 + r)}`,
    `L${round(x1)} ${round(y1 - r)}`,
    `Q${round(x1)} ${round(y1)} ${round(x1 - r)} ${round(y1)}`,
    `L${round(cx + 7)} ${round(y1)}`,
    `L${round(cx)} ${round(y1 + tail)}`,
    `L${round(cx - 7)} ${round(y1)}`,
    `L${round(x0 + r)} ${round(y1)}`,
    `Q${round(x0)} ${round(y1)} ${round(x0)} ${round(y1 - r)}`,
    `L${round(x0)} ${round(y0 + r)}`,
    `Q${round(x0)} ${round(y0)} ${round(x0 + r)} ${round(y0)}`,
    'Z',
  ].join('');
}
