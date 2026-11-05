/**
 * Stripe reports amounts in the currency's minor unit, except for the
 * zero-decimal currencies below where the amount is already whole.
 *
 * This lives in `src/lib` because both the payment provider adapter and the
 * shared payment data-access layer need the same conversion.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

export function formatStripeAmount(amount: number | null | undefined, currency: string) {
  const normalizedAmount = amount || 0;

  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return normalizedAmount.toFixed(4);
  }

  return (normalizedAmount / 100).toFixed(4);
}
