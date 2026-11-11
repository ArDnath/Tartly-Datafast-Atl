import type { Metadata } from 'next';
import { CheckoutHandoff } from '@/features/billing/CheckoutHandoff';
import {
  parseCheckoutIntent,
  type CheckoutSearchParams,
} from '@/features/billing/lib/checkout-intent';

interface CheckoutPageProps {
  searchParams: Promise<CheckoutSearchParams>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;

  return <CheckoutHandoff intent={parseCheckoutIntent(params)} />;
}

export const metadata: Metadata = {
  title: 'Checkout',
  robots: {
    index: false,
    follow: false,
  },
};
