import type { CSSProperties } from 'react';
import { roundedDiamond } from './iso';
import { Callout, IsoTile, PaymentNode } from './primitives';

export interface SceneProps {
  active: boolean;
}

const sceneClass = (active: boolean) => `rj-svg rj-scene${active ? ' is-active' : ''}`;
const activeAttr = (active: boolean) => (active ? 'true' : 'false');

/**
 * Stage 01 — traffic, meet revenue.
 *
 * One source marker on the left, one purchase on the right, and a visitor that
 * travels the connection between them. The route draws first, then the marker
 * rides it, and the amount appears only once the journey has arrived.
 */
export function TrafficRevenueScene({ active }: SceneProps) {
  return (
    <svg
      className={sceneClass(active)}
      data-active={activeAttr(active)}
      viewBox="0 75 880 550"
      role="img"
      aria-label="An anonymous visitor travels across an isometric platform to a payment marker carrying a $249 callout."
    >
      <g transform="translate(0 -55)">
        <path
          d={roundedDiamond(440, 405, 392, 190, 24)}
          fill="#fffdf6"
          stroke="#d8cfbd"
          strokeWidth="1.15"
        />
        <path
          className="rj-platform-inner"
          d={roundedDiamond(440, 405, 370, 177, 20)}
          fill="none"
          stroke="#e8dfcf"
          strokeWidth="1"
        />

        <IsoTile cx={238} cy={314} label="Direct" glyph="cursor" delay={0} />

        <path
          className="rj-draw rj-wire is-selected"
          d="M312 344C386 359 486 388 607 407"
          pathLength={1}
          style={{ '--rj-delay': '320ms' } as CSSProperties}
        />

        <ellipse className="rj-entry-ring" cx="238" cy="365" rx="13" ry="7" />
        <circle className="rj-source-dot is-selected" cx="238" cy="365" r="4.2" />

        <PaymentNode cx={644} topY={397} baseY={470} delay={280} />

        <circle className="rj-end-dot" cx="607" cy="407" r="5" />
        <g className="rj-visitor rj-visitor-one" style={{ '--rj-delay': '880ms' } as CSSProperties}>
          <ellipse cx="607" cy="407" rx="5.2" ry="3.6" />
        </g>

        <Callout cx={644} top={300} text="$249" delay={1420} />
      </g>
    </svg>
  );
}

/**
 * Stage 02 — every payment, traced.
 *
 * Three source slabs sit on the attribution surface. Their paths draw in
 * sequence; the selected path (Ads, the last touch) stays orange while the
 * others settle to warm grey. The $249 callout names the payment at the join.
 */
export function AttributionScene({ active }: SceneProps) {
  return (
    <svg
      className={sceneClass(active)}
      data-active={activeAttr(active)}
      viewBox="0 75 880 550"
      role="img"
      aria-label="Direct, organic and ads sources connect to one payment. The ads path is selected and carries the $249 payment."
    >
      <path
        d={roundedDiamond(440, 412, 400, 196, 26)}
        fill="#fffdf6"
        stroke="#d8cfbd"
        strokeWidth="1.15"
      />
      <path
        className="rj-platform-inner"
        d={roundedDiamond(440, 412, 377, 183, 22)}
        fill="none"
        stroke="#e8dfcf"
        strokeWidth="1"
      />

      <IsoTile cx={232} cy={326} label="Direct" glyph="cursor" delay={0} />
      <IsoTile cx={461} cy={220} label="Organic" glyph="globe" delay={180} />
      <IsoTile cx={704} cy={326} label="Ads" glyph="megaphone" delay={360} />

      <path
        className="rj-draw rj-wire"
        d="M286 346C342 369 391 407 425 445"
        pathLength={1}
        style={{ '--rj-delay': '620ms' } as CSSProperties}
      />
      <path
        className="rj-draw rj-wire"
        d="M461 264C460 323 452 383 448 437"
        pathLength={1}
        style={{ '--rj-delay': '790ms' } as CSSProperties}
      />
      <path
        className="rj-draw rj-wire is-selected"
        d="M659 349C602 382 524 409 480 441"
        pathLength={1}
        style={{ '--rj-delay': '960ms' } as CSSProperties}
      />

      <circle className="rj-source-dot" cx="286" cy="346" r="3.6" />
      <circle className="rj-source-dot" cx="461" cy="264" r="3.6" />
      <circle className="rj-source-dot is-selected" cx="659" cy="349" r="4.3" />
      <circle className="rj-end-dot" cx="480" cy="441" r="5" />

      <PaymentNode cx={445} topY={451} baseY={524} delay={520} />

      <g className="rj-sparks" aria-hidden="true">
        <path d="M777 275l13-7" />
        <path d="M787 293l15-2" />
        <path d="M774 310l10 8" />
      </g>

      <path
        className="rj-draw rj-scrawl"
        d="M845 112C874 184 826 255 763 279"
        pathLength={1}
        style={{ '--rj-delay': '1180ms' } as CSSProperties}
      />
      <path
        className="rj-arrow-head"
        d="M781 259 763 279 790 285"
        style={{ '--rj-delay': '1180ms' } as CSSProperties}
      />

      <Callout cx={445} top={326} text="$249" delay={1350} />
    </svg>
  );
}

interface TierProps {
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
  depth: number;
  label: string;
  count: string;
  signal?: boolean;
  delay: number;
  compact?: boolean;
}

/** One extruded funnel terrace. The paid terrace swaps the paper face for signal. */
function Tier({
  cx,
  cy,
  halfWidth,
  halfHeight,
  depth,
  label,
  count,
  signal = false,
  delay,
  compact = false,
}: TierProps) {
  return (
    <g className="rj-node rj-tier" style={{ '--rj-delay': `${delay}ms` } as CSSProperties}>
      <ellipse className="rj-tier-shadow" cx={cx} cy={cy + depth + 50} rx={halfWidth} ry="14" />
      <path
        d={roundedDiamond(cx, cy + depth, halfWidth, halfHeight, 24)}
        fill="#efe4ce"
        stroke="#d4c8b3"
        strokeWidth="1"
      />
      <path
        d={roundedDiamond(cx, cy, halfWidth, halfHeight, 24)}
        fill={signal ? '#ff4b0b' : '#fffdf6'}
        stroke={signal ? '#191817' : '#c9bfab'}
        strokeWidth="1.15"
      />
      <text
        className={`rj-tier-label${compact ? ' is-compact' : ''}`}
        x={cx}
        y={cy + (compact ? -3 : -4)}
        textAnchor="middle"
        fill={signal ? '#ffffff' : '#191817'}
      >
        {label}
      </text>
      <text
        className={`rj-tier-count${compact ? ' is-compact' : ''}`}
        x={cx}
        y={cy + (compact ? 12 : 15)}
        textAnchor="middle"
        fill={signal ? '#ffe3d6' : '#8f877a'}
      >
        {count}
      </text>
    </g>
  );
}

/**
 * Stage 03 — see where they drop.
 *
 * Three terraces, three visitors. Two fall away between stages, one lands on
 * the paid terrace, which turns signal orange and carries the conversion count.
 */
export function ConversionFunnelScene({ active }: SceneProps) {
  return (
    <svg
      className={sceneClass(active)}
      data-active={activeAttr(active)}
      viewBox="0 75 880 550"
      role="img"
      aria-label="An isometric funnel with signup, trial and paid terrace. Two visitors drop away; one reaches the orange paid terrace with 84 conversions."
    >
      <g transform="translate(0 20)">
        <path
          d={roundedDiamond(440, 360, 366, 174, 26)}
          fill="#fffdf6"
          stroke="#d8cfbd"
          strokeWidth="1.15"
        />
        <path
          className="rj-platform-inner"
          d={roundedDiamond(440, 360, 344, 162, 22)}
          fill="none"
          stroke="#e8dfcf"
          strokeWidth="1"
        />

        <Tier
          cx={440}
          cy={205}
          halfWidth={224}
          halfHeight={112}
          depth={16}
          label="Signup"
          count="1,284"
          delay={0}
        />
        <Tier
          cx={440}
          cy={330}
          halfWidth={157}
          halfHeight={79}
          depth={14}
          label="Trial"
          count="312"
          delay={200}
        />
        <Tier
          cx={440}
          cy={425}
          halfWidth={104}
          halfHeight={53}
          depth={12}
          label="Paid"
          count="84"
          signal
          delay={400}
          compact
        />

        <ellipse className="rj-paid-ring" cx="440" cy="425" rx="118" ry="60" />

        <circle className="rj-visitor rj-funnel-dot rj-drop-signup" cx="382" cy="205" r="4.6" />
        <circle className="rj-visitor rj-funnel-dot rj-drop-trial" cx="500" cy="330" r="4.6" />
        <circle className="rj-visitor rj-funnel-dot rj-reaches-paid" cx="474" cy="432" r="5" />

        <path
          className="rj-draw rj-wire is-selected"
          d="M620 465C592 474 556 471 523 455"
          pathLength={1}
          style={{ '--rj-delay': '1480ms' } as CSSProperties}
        />
        <Callout cx={648} top={408} text="84 paid" delay={1580} />
      </g>
    </svg>
  );
}
