import { BRAND } from '@/lib/brand';
import { forbidden } from '@/lib/response';

export function legacyFeatureDisabled(feature: string) {
  return forbidden({
    message: `${feature} is disabled in ${BRAND.name}.`,
    code: 'legacy-feature-disabled',
  });
}
