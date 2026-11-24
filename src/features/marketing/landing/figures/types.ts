/**
 * The shape every feature figure speaks: a list of things to paint, back to
 * front. A solid is a silhouette; a bead is a flat dot; a bubble is a callout
 * carrying a figure; a wire is a stroke that draws itself to show a connection.
 * The order never changes between frames, so the stage binds to it once and then
 * only rewrites what moved.
 */

export type Tone = 'dot' | 'dot m' | 'dot off' | 'dot signal';

export interface SolidItem {
  kind: 'solid';
  key: string;
  sil: string;
  hi?: boolean;
}

/**
 * A connection drawn with a stroke rather than a fill. `pathLength` is fixed to
 * 1 by the stage, so `progress` is a plain 0–1 dash offset: no geometry work in
 * the frame loop, and the draw reads as a line being traced.
 */
export interface WireItem {
  kind: 'wire';
  key: string;
  d: string;
  progress: number;
  /** The chosen attribution path is signal orange; the others stay muted. */
  active?: boolean;
}

export interface DotItem {
  kind: 'dot';
  key: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tone: Tone;
}

export interface BubbleItem {
  kind: 'bubble';
  key: string;
  path: string;
  /** Group anchor in screen coords. */
  x: number;
  /** Group anchor in screen coords. */
  y: number;
  /** Label position in local coords. Defaults to the group origin. */
  tx?: number;
  ty?: number;
  text: string;
  /** Entrance scale. The designed still is 1; frames grow it from 0. */
  scale?: number;
}

export type Item = SolidItem | DotItem | BubbleItem | WireItem;

export interface Figure {
  view: string;
  /** What the read-out says when nothing is under the pointer. */
  caption: string;
  /** What the read-out says for one part. */
  label: (key: string | null) => string;
  /**
   * The part the figure is drawing attention to on its own. The read-out names
   * it while nothing is under the pointer, so the figure narrates itself.
   */
  watch?: () => string | null;
  /** The designed still, and what the server renders: no clock has run yet. */
  rest: () => Item[];
  /** The part under a viewBox point, tested against the rest pose. */
  pick: (x: number, y: number) => string | null;
  /** The part the pointer chose, or null. */
  select: (key: string | null) => void;
  /** Advances by one frame and returns what to paint now. */
  frame: (dtMs: number) => Item[];
}
