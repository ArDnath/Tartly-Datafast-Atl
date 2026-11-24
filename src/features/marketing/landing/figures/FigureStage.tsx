'use client';

import { useEffect, useRef } from 'react';
import { attributionRails } from './attributionRails';
import { funnelSteps } from './funnelSteps';
import { animate } from './loop';
import { trafficRevenue } from './trafficRevenue';
import type { Figure, Item } from './types';

const NS = 'http://www.w3.org/2000/svg';

/**
 * The figures are resolved here, on the client, because a figure carries
 * functions and a server component may not pass one across the boundary. The
 * section names a figure by id and ships only its description.
 */
const FIGURES: Record<string, Figure> = {
  'traffic-revenue': trafficRevenue,
  'attribution-rails': attributionRails,
  'funnel-steps': funnelSteps,
};

/** The class a dot takes, from its tone. Four weights are the whole palette. */
const dotClass = (tone: string) =>
  `lp-fig-dot ${
    tone === 'dot' ? 'on' : tone === 'dot m' ? 'mid' : tone === 'dot signal' ? 'signal' : 'off'
  }`;

const wireClass = (active: boolean | undefined) => `lp-fig-wire${active ? ' on' : ''}`;

interface Node {
  sil?: SVGPathElement;
  wire?: SVGPathElement;
  dot?: SVGEllipseElement;
  bubble?: SVGGElement;
  cloud?: SVGPathElement;
  label?: SVGElement;
  bx?: number;
  by?: number;
  bs?: number;
  btx?: number;
  bty?: number;
  bTransUntil?: number;
}

/**
 * Builds one DOM node per item, in the pose's paint order. The order is fixed
 * for the life of a figure, so this runs once per mount and the loop only ever
 * rewrites attributes on the nodes it made here.
 */
function bind(svg: SVGSVGElement, items: Item[]) {
  const nodes = new Map<string, Node>();
  for (const item of items) {
    if (item.kind === 'dot') {
      const dot = document.createElementNS(NS, 'ellipse');
      dot.setAttribute('cx', String(item.cx));
      dot.setAttribute('cy', String(item.cy));
      dot.setAttribute('rx', String(item.rx));
      dot.setAttribute('ry', String(item.ry));
      dot.setAttribute('class', dotClass(item.tone));
      svg.appendChild(dot);
      nodes.set(item.key, {
        sil: document.createElementNS(NS, 'path'),
        dot,
      });
      continue;
    }
    if (item.kind === 'wire') {
      const wire = document.createElementNS(NS, 'path');
      wire.setAttribute('d', item.d);
      wire.setAttribute('class', wireClass(item.active));
      // A unit path length makes the dash offset a plain 0–1 draw progress.
      wire.setAttribute('pathLength', '1');
      wire.style.strokeDasharray = '1';
      wire.style.strokeDashoffset = String(1 - item.progress);
      svg.appendChild(wire);
      nodes.set(item.key, { wire });
      continue;
    }
    if (item.kind === 'bubble') {
      const group = document.createElementNS(NS, 'g');
      group.setAttribute('class', 'lp-fig-bubble');
      group.style.transform = `translate(${item.x}px, ${item.y}px) scale(${item.scale ?? 1})`;
      group.style.transition = 'none';
      const cloud = document.createElementNS(NS, 'path');
      cloud.setAttribute('d', item.path);
      cloud.setAttribute('class', 'lp-fig-cloud');
      group.appendChild(cloud);
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', String(item.tx ?? 0));
      label.setAttribute('y', String(item.ty ?? 0));
      label.setAttribute('class', 'lp-fig-bubble-text');
      label.textContent = item.text;
      group.appendChild(label);
      svg.appendChild(group);
      nodes.set(item.key, {
        bubble: group,
        cloud,
        label,
        bx: item.x,
        by: item.y,
        bs: item.scale ?? 1,
        btx: item.tx ?? 0,
        bty: item.ty ?? 0,
      });
      continue;
    }
    const group = document.createElementNS(NS, 'g');
    const sil = document.createElementNS(NS, 'path');
    sil.setAttribute('d', item.sil);
    sil.setAttribute('class', `lp-fig-solid${item.hi ? ' hi' : ''}`);
    group.appendChild(sil);
    svg.appendChild(group);
    nodes.set(item.key, { sil });
  }
  return nodes;
}

/** The rest pose as markup, so the card is complete in the server's HTML. */
function FigureStill({ figure, describe }: { figure: Figure; describe: string }) {
  return (
    <svg viewBox={figure.view} role="img" aria-label={describe} className="lp-fig-svg">
      {figure.rest().map(item => {
        if (item.kind === 'dot') {
          return (
            <ellipse
              key={item.key}
              cx={item.cx}
              cy={item.cy}
              rx={item.rx}
              ry={item.ry}
              className={dotClass(item.tone)}
            />
          );
        }
        if (item.kind === 'wire') {
          return (
            <path
              key={item.key}
              d={item.d}
              className={wireClass(item.active)}
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - item.progress }}
            />
          );
        }
        if (item.kind === 'bubble') {
          return (
            <g
              key={item.key}
              className="lp-fig-bubble"
              style={{
                transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale ?? 1})`,
              }}
            >
              <path d={item.path} className="lp-fig-cloud" />
              <text x={item.tx ?? 0} y={item.ty ?? 0} className="lp-fig-bubble-text">
                {item.text}
              </text>
            </g>
          );
        }
        return (
          <g key={item.key}>
            <path d={item.sil} className={`lp-fig-solid${item.hi ? ' hi' : ''}`} />
          </g>
        );
      })}
    </svg>
  );
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Writes a pose onto the nodes, touching only what changed. */
function paint(nodes: Map<string, Node>, items: Item[]) {
  const reduce = reducedMotion();
  for (const item of items) {
    const node = nodes.get(item.key);
    if (!node) continue;

    if (item.kind === 'dot') {
      const dot = node.dot;
      if (!dot) continue;
      const cx = String(Math.round(item.cx * 100) / 100);
      const cy = String(Math.round(item.cy * 100) / 100);
      if (dot.getAttribute('cx') !== cx) dot.setAttribute('cx', cx);
      if (dot.getAttribute('cy') !== cy) dot.setAttribute('cy', cy);
      const cls = dotClass(item.tone);
      if (dot.getAttribute('class') !== cls) dot.setAttribute('class', cls);
      continue;
    }

    if (item.kind === 'wire') {
      const wire = node.wire;
      if (!wire) continue;
      if (wire.getAttribute('d') !== item.d) wire.setAttribute('d', item.d);
      const offset = String(Math.round((1 - item.progress) * 1000) / 1000);
      if (wire.style.strokeDashoffset !== offset) wire.style.strokeDashoffset = offset;
      const cls = wireClass(item.active);
      if (wire.getAttribute('class') !== cls) wire.setAttribute('class', cls);
      continue;
    }

    if (item.kind === 'bubble') {
      const cloud = node.cloud;
      const label = node.label;
      const group = node.bubble;
      if (!cloud || !label || !group) continue;
      const scale = item.scale ?? 1;
      if (node.bx !== item.x || node.by !== item.y || node.bs !== scale) {
        const dx = item.x - (node.bx ?? item.x);
        const dy = item.y - (node.by ?? item.y);
        const jump = Math.hypot(dx, dy);
        if (!reduce && jump > 12) {
          group.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
          node.bTransUntil = performance.now() + 260;
        } else if ((node.bTransUntil ?? 0) < performance.now()) {
          group.style.transition = 'none';
        }
        group.style.transform = `translate(${item.x}px, ${item.y}px) scale(${scale})`;
        node.bx = item.x;
        node.by = item.y;
        node.bs = scale;
      }
      if (cloud.getAttribute('d') !== item.path) cloud.setAttribute('d', item.path);
      const tx = item.tx ?? 0;
      const ty = item.ty ?? 0;
      if (node.btx !== tx) {
        label.setAttribute('x', String(tx));
        node.btx = tx;
      }
      if (node.bty !== ty) {
        label.setAttribute('y', String(ty));
        node.bty = ty;
      }
      if (label.textContent !== item.text) label.textContent = item.text;
      continue;
    }

    const sil = node.sil;
    if (!sil) continue;
    if (sil.getAttribute('d') !== item.sil) sil.setAttribute('d', item.sil);
    const cls = `lp-fig-solid${item.hi ? ' hi' : ''}`;
    if (sil.getAttribute('class') !== cls) sil.setAttribute('class', cls);
  }
}

/**
 * The live figure. On mount it clears the still and binds animated nodes in its
 * place, feeds the pointer through the figure's own rest-pose hit test, and
 * writes what is under the pointer straight into the read-out node, so moving a
 * hand across the drawing never costs a React render.
 */
export function FigureStage({ id, describe }: { id: string; describe: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const read = useRef<HTMLSpanElement | null>(null);
  const figure = FIGURES[id];

  useEffect(() => {
    const element = host.current;
    const svg = element?.querySelector('svg');
    if (!element || !svg || !figure) return;

    svg.replaceChildren();
    const nodes = bind(svg, figure.rest());

    // What the pointer holds wins; otherwise the figure names what it is
    // highlighting on its own, so the read-out narrates the loop.
    let hovered: string | null = null;
    let shown = figure.caption;
    const readNow = () => {
      const key = hovered ?? figure.watch?.() ?? null;
      const next = figure.label(key);
      if (next !== shown && read.current) {
        shown = next;
        read.current.textContent = next;
      }
    };

    let binding: ReturnType<typeof animate> | null = null;
    binding = animate(figure, element, items => {
      paint(nodes, items);
      readNow();
    });

    const move = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 400;
      const y = ((event.clientY - rect.top) / rect.height) * 320;
      const next = figure.pick(x, y);
      if (next === hovered) return;
      hovered = next;
      figure.select(next);
      readNow();
      // Under reduced motion no frames run, so the bright stroke is repainted
      // here, on the user's own input, rather than on a clock.
      binding?.redraw();
    };
    const leave = () => {
      if (hovered === null) return;
      hovered = null;
      figure.select(null);
      readNow();
      binding?.redraw();
    };

    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', leave);

    return () => {
      binding?.stop();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
      if (read.current) read.current.textContent = figure.caption;
      svg.replaceChildren();
    };
  }, [figure]);

  if (!figure) return null;

  return (
    <div className="lp-fig-frame">
      <div ref={host} className="lp-fig">
        <FigureStill figure={figure} describe={describe} />
      </div>
      <p className="lp-fig-read" aria-live="off">
        <span ref={read}>{figure.caption}</span>
      </p>
    </div>
  );
}
