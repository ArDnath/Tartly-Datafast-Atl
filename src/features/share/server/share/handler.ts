import { legacyFeatureDisabled } from '@/features/legacy/lib/legacy-features';

export async function POST() {
  return legacyFeatureDisabled('Share');
}
