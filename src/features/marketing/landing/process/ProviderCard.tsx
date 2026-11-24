'use client';

import { Check as CheckIcon } from '@/components/icons';

interface ProviderCardProps {
  /** True once the card has entered the viewport (or motion is reduced). */
  live: boolean;
}

const PROVIDERS = [
  { name: 'Stripe', logo: '/images/payments/stripe.svg' },
  { name: 'Dodo', logo: '/images/payments/dodo-payments.svg' },
  { name: 'Lemon Squeezy', logo: '/images/payments/lemon-squeezy.svg' },
  { name: 'Polar', logo: '/images/payments/polar.svg' },
  { name: 'Yolfi', logo: '/images/payments/yolfi.png' },
] as const;

/**
 * Plate 2 — the payment sources.
 *
 * The six chips keep the shipped 2 × 3 grid; a faint SVG spine sits behind them
 * and draws only when the surrounding card is hovered or expanded. The finished
 * markup is always present, so a page without JavaScript shows the whole web.
 */
export function ProviderCard({ live }: ProviderCardProps) {
  return (
    <div
      className="lp-step-band lp-step-band--pay lp-process-provider"
      data-live={live ? 'true' : 'false'}
    >
      <div className="lp-process-provider-frame">
        <svg
          className="lp-process-web"
          viewBox="0 0 320 200"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path pathLength={1} d="M160 14 V186" />
          <path pathLength={1} d="M160 45 C132 45 100 45 60 45" />
          <path pathLength={1} d="M160 100 C188 100 220 100 260 100" />
          <path pathLength={1} d="M160 156 C132 156 100 156 60 156" />
          <path
            pathLength={1}
            d="M160 100 C132 100 100 100 60 100 M160 156 C188 156 220 156 260 156"
          />
        </svg>

        <ul className="lp-step-providers" aria-label="Works with">
          {PROVIDERS.map(provider => (
            <li key={provider.name} className="lp-step-provider">
              <img
                src={provider.logo}
                alt=""
                aria-hidden="true"
                className="lp-step-provider-logo"
                width={16}
                height={16}
                loading="lazy"
              />
              <span>{provider.name}</span>
            </li>
          ))}
          <li className="lp-step-provider lp-step-provider--api">
            <span className="lp-step-provider-code" aria-hidden="true">
              &lt;/&gt;
            </span>
            <span>Manual API</span>
          </li>
        </ul>
      </div>

      <div className="lp-process-code-status lp-process-provider-status">
        <span className="lp-process-code-dot" aria-hidden="true" />
        <CheckIcon className="lp-process-code-check" strokeWidth={3} aria-hidden="true" />
        <span>All sources connected</span>
      </div>
    </div>
  );
}
