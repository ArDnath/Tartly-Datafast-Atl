import type { CSSProperties } from 'react';
import { callout, roundedDiamond } from './iso';

/** The small line-art marks that sit on top of the isometric tiles. */
export function Glyph({ name }: { name: 'cursor' | 'globe' | 'megaphone' | 'card' }) {
  if (name === 'cursor') {
    return (
      <path
        d="M-5-9 7 2 1.5 3.4 4 9 1 10.5-1.5 4.8-5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }

  if (name === 'globe') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round">
        <circle cx="0" cy="0" r="8" />
        <ellipse cx="0" cy="0" rx="3.4" ry="8" />
        <path d="M-8 0h16M-7-3.7h14M-7 3.7h14" />
      </g>
    );
  }

  if (name === 'megaphone') {
    return (
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-9 1.2-3-2 7-8.5v15L-3 3.2-9 3Z" />
        <path d="M-8 3v5.4h4V3.4" />
        <path d="M11-3.4h3M11 0h4M11 3.4h3" />
      </g>
    );
  }

  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round">
      <rect x="-8.5" y="-5.5" width="17" height="11" rx="2" />
      <path d="M-8.5-1.5h17" />
    </g>
  );
}

interface IsoTileProps {
  cx: number;
  cy: number;
  label: string;
  glyph: 'cursor' | 'globe' | 'megaphone' | 'card';
  delay?: number;
  muted?: boolean;
}

/**
 * A raised attribution node. Two rounded diamonds make the slab: the lower one
 * is the visible thickness, the upper one carries the icon and label.
 */
export function IsoTile({ cx, cy, label, glyph, delay = 0, muted = false }: IsoTileProps) {
  return (
    <g
      className={`rj-node rj-tile${muted ? ' is-muted' : ''}`}
      style={{ '--rj-delay': `${delay}ms` } as CSSProperties}
    >
      <ellipse className="rj-tile-shadow" cx={cx} cy={cy + 58} rx="86" ry="15" />
      <path
        d={roundedDiamond(cx, cy + 13, 87, 44, 16)}
        fill="#efe4ce"
        stroke="#d4c8b3"
        strokeWidth="1"
      />
      <path
        d={roundedDiamond(cx, cy, 87, 44, 16)}
        fill="#fffdf6"
        stroke="#c9bfab"
        strokeWidth="1.15"
      />
      <g className="rj-glyph" transform={`translate(${cx} ${cy - 10})`}>
        <Glyph name={glyph} />
      </g>
      <text className="rj-tile-label" x={cx} y={cy + 23} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

interface PaymentNodeProps {
  cx: number;
  topY: number;
  baseY: number;
  delay?: number;
}

/** The purchase at the centre of every scene: a small prism on a plinth. */
export function PaymentNode({ cx, topY, baseY, delay = 0 }: PaymentNodeProps) {
  const rx = 32;
  const ry = 11;
  return (
    <g className="rj-node rj-payment" style={{ '--rj-delay': `${delay}ms` } as CSSProperties}>
      <ellipse className="rj-payment-shadow" cx={cx} cy={baseY + 33} rx="82" ry="18" />
      <path
        d={roundedDiamond(cx, baseY + 15, 108, 54, 18)}
        fill="#fffdf6"
        stroke="#d2c7b2"
        strokeWidth="1.1"
      />
      <path
        d={`M${cx - rx} ${topY} L${cx - rx} ${baseY + 8} A${rx} ${ry} 0 0 0 ${cx + rx} ${baseY + 8} L${cx + rx} ${topY} Z`}
        fill="#fff8ee"
        stroke="#191817"
        strokeWidth="1.3"
      />
      <ellipse
        cx={cx}
        cy={topY}
        rx={rx}
        ry={ry}
        fill="#ff4b0b"
        stroke="#191817"
        strokeWidth="1.35"
      />
      <g className="rj-card-glyph" transform={`translate(${cx} ${topY}) rotate(-7) scale(.72)`}>
        <Glyph name="card" />
      </g>
    </g>
  );
}

interface CalloutProps {
  cx: number;
  top: number;
  text: string;
  width?: number;
  height?: number;
  delay?: number;
  tone?: 'paper' | 'signal';
}

/** The floating figure that lands after a path or a stage completes. */
export function Callout({
  cx,
  top,
  text,
  width = 96,
  height = 44,
  delay = 0,
  tone = 'paper',
}: CalloutProps) {
  return (
    <g
      className={`rj-tip${tone === 'signal' ? ' is-signal' : ''}`}
      style={{ '--rj-delay': `${delay}ms` } as CSSProperties}
    >
      <path
        className="rj-tip-shape"
        d={callout(cx, top, width, height, 10, 10)}
        fill={tone === 'signal' ? '#ff4b0b' : '#fffdf6'}
        stroke="#191817"
        strokeWidth="1.35"
      />
      <text
        className="rj-tip-text"
        x={cx}
        y={top + height / 2 + 5}
        textAnchor="middle"
        fill={tone === 'signal' ? '#ffffff' : '#191817'}
      >
        {text}
      </text>
    </g>
  );
}
