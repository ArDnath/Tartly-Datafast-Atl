import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { PricingPage } from './PricingPage';

export default function () {
  return <PricingPage />;
}

export const metadata: Metadata = {
  title: 'Pricing',
  description: `${BRAND.name} pricing. ${BRAND.promise}`,
};
