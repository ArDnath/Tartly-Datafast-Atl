import { BrandMark } from '@/components/brand/BrandMark';
import { BRAND } from '@/lib/brand';

/**
 * Light-background lockup. The global BrandWordmark is tuned for the dark app
 * shell, so the marketing header uses the same mark with ink text instead.
 */
export function BrandLockup({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-900">
      <BrandMark size={size} />
      <span className="text-lg font-semibold tracking-[-0.035em]">{BRAND.name}</span>
    </span>
  );
}
