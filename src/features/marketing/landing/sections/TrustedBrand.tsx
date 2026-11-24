import { Reveal } from '../motion/Reveal';

const PAYMENT_PROVIDERS = [
  { name: 'Stripe', logo: '/images/payments/stripe.svg' },
  { name: 'Dodo Payments', logo: '/images/payments/dodo-payments.svg' },
  { name: 'Lemon Squeezy', logo: '/images/payments/lemon-squeezy.svg' },
  { name: 'Polar', logo: '/images/payments/polar.svg' },
  { name: 'Yolfi', logo: '/images/payments/yolfi.png' },
];

export function TrustedBrand() {
  return (
    <section aria-labelledby="payments-title" className="border-b border-lp-line bg-lp-card/60">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col items-center gap-6 sm:gap-7 lg:flex-row lg:justify-between">
          <Reveal>
            <p
              id="payments-title"
              className="lp-label max-w-xs text-center text-lp-fg-muted lg:text-left"
            >
              Connects to the payment providers you already use
            </p>
          </Reveal>

          <ul className="grid w-full max-w-3xl min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-lp-line bg-lp-line sm:grid-cols-3 lg:max-w-4xl lg:grid-cols-5">
            {PAYMENT_PROVIDERS.map((provider, index) => (
              <li
                key={provider.name}
                className={`payment-cell group relative min-w-0 ${
                  index === PAYMENT_PROVIDERS.length - 1
                    ? 'col-span-2 sm:col-span-1 lg:col-span-1'
                    : ''
                }`}
              >
                <Reveal
                  delay={index * 45}
                  distance={12}
                  className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-1.5 px-2 py-3.5 sm:flex-row sm:gap-2 sm:px-3 sm:py-4"
                >
                  <span className="relative flex size-7 shrink-0 items-center justify-center">
                    <img
                      src={provider.logo}
                      alt=""
                      width={24}
                      height={24}
                      className="payment-cell-logo h-6 w-6 object-contain opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                    />
                  </span>
                  <span className="relative min-w-0 text-[11px] font-bold text-lp-ink/70 transition-colors duration-200 group-hover:text-lp-ink">
                    {provider.name}
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <Reveal delay={100}>
          <p className="mt-4 text-center text-[11px] text-lp-fg-muted">
            Plus a manual payment API for custom checkouts. Credentials encrypted at rest.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
