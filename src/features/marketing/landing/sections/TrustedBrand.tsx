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
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Reveal>
          <div className="flex flex-col items-center gap-7 lg:flex-row lg:justify-between">
            <p
              id="payments-title"
              className="lp-label max-w-xs text-center text-lp-fg-muted lg:text-left"
            >
              Connects to the payment providers you already use
            </p>

            <ul className="grid w-full max-w-3xl grid-cols-2 items-stretch divide-lp-line overflow-hidden rounded-lg border border-lp-line bg-lp-canvas/60 sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
              {PAYMENT_PROVIDERS.map(provider => (
                <li
                  key={provider.name}
                  className="flex items-center justify-center gap-2 border-b border-lp-line px-3 py-3 last:border-b-0 sm:border-b-0 sm:last:border-r-0"
                >
                  <img
                    src={provider.logo}
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain opacity-70 grayscale transition-[opacity,filter] duration-200 hover:opacity-100 hover:grayscale-0"
                  />
                  <span className="text-[11px] font-bold whitespace-nowrap text-lp-ink/75">
                    {provider.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <p className="mt-4 text-center text-[11px] text-lp-fg-muted">
            Plus a manual payment API for custom checkout systems. Credentials are encrypted at
            rest.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
