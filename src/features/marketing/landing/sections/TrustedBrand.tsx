const PAYMENT_PROVIDERS = [
  { name: 'Stripe', logo: '/images/payments/stripe.svg' },
  { name: 'Dodo Payments', logo: '/images/payments/dodo-payments.svg' },
  { name: 'Lemon Squeezy', logo: '/images/payments/lemon-squeezy.svg' },
  { name: 'Polar', logo: '/images/payments/polar.svg' },
  { name: 'Yolfi', logo: '/images/payments/yolfi.png' },
];

export function TrustedBrand() {
  return (
    <section className="mt-14" aria-labelledby="integrations-title">
      <p id="integrations-title" className="px-4 py-4 text-center text-base text-gray-400">
        Connects to the payment providers{' '}
        <span className="whitespace-nowrap">you already use —</span>
      </p>

      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-8 px-4 py-3 md:justify-between md:gap-14">
        {PAYMENT_PROVIDERS.map(provider => (
          <div key={provider.name} className="flex items-center gap-2.5">
            <img
              src={provider.logo}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="text-sm font-medium text-gray-600">{provider.name}</span>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-2 max-w-md px-4 text-center text-xs text-gray-400">
        Plus a manual payment API for custom checkout systems. Credentials are encrypted at rest.
      </p>
    </section>
  );
}
