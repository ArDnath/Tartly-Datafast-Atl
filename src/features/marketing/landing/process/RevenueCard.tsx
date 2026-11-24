'use client';

import { useState } from 'react';
import { useCountUp } from './useCountUp';

interface RevenueCardProps {
  /** True once the card has entered the viewport (or motion is reduced). */
  live: boolean;
}

const TOTAL = 7540;
const ROWS = [
  { label: 'Organic / Google', value: 4280, pct: 100 },
  { label: 'Direct', value: 2140, pct: 50 },
  { label: 'Product Hunt', value: 1120, pct: 26 },
] as const;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * The final figure stays in the accessibility tree at all times; only the
 * decorative digits change while counting up. The currency mark is a separate
 * aria-hidden span so the final figure appears once in the accessible text.
 */
function Amount({
  value,
  target,
  className,
}: {
  value: number;
  target: number;
  className: string;
}) {
  return (
    <span className={className}>
      <span className="sr-only">{usd.format(target)}</span>
      <span aria-hidden="true">$</span>
      <span aria-hidden="true">{value.toLocaleString('en-US')}</span>
    </span>
  );
}

function RevenueRow({
  label,
  target,
  pct,
  live,
  reduced,
}: {
  label: string;
  target: number;
  pct: number;
  live: boolean;
  reduced: boolean;
}) {
  const value = useCountUp(target, live, reduced);

  return (
    <div className="lp-step-bar-row lp-process-bar-row">
      <div className="lp-step-bar-meta">
        <span className="lp-step-bar-label">{label}</span>
        <Amount value={value} target={target} className="lp-step-bar-value" />
      </div>
      <div className="lp-step-bar-track" aria-hidden="true">
        <div
          className="lp-step-bar-fill lp-process-bar-fill"
          style={{ '--lp-bar-scale': pct / 100 } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/**
 * Plate 3 — the revenue panel, clearly marked as sample data. Every final
 * number is in the server HTML; motion only animates the decorative digits and
 * the bar transforms after the card is on screen.
 */
export function RevenueCard({ live }: RevenueCardProps) {
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const total = useCountUp(TOTAL, live, reduced);

  return (
    <div className="lp-step-band lp-step-band--chart">
      <div className="lp-step-revenue lp-process-revenue" data-live={live ? 'true' : 'false'}>
        <div className="lp-step-revenue-head">
          <span className="lp-step-revenue-title">Revenue by source</span>
          <span className="lp-step-revenue-sample">Sample</span>
        </div>

        <div className="lp-process-revenue-total">
          <span className="lp-process-total-label">This month</span>
          <Amount value={total} target={TOTAL} className="lp-process-total-value" />
        </div>

        <div className="lp-step-bars">
          {ROWS.map(row => (
            <RevenueRow
              key={row.label}
              label={row.label}
              target={row.value}
              pct={row.pct}
              live={live}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
