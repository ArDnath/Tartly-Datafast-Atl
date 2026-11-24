'use client';

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
 * The six chips keep the shipped 2 × 3 grid. The finished markup is always
 * present, so a page without JavaScript shows every provider.
 */
export function ProviderCard({ live }: ProviderCardProps) {
  return (
    <div
      className="lp-step-band lp-step-band--pay lp-process-provider"
      data-live={live ? 'true' : 'false'}
    >
      <div className="lp-process-provider-frame">
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
    </div>
  );
}
