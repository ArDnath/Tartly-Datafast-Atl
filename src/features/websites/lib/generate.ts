import { randomBytes } from 'node:crypto';

/**
 * Share slugs are bearer credentials until the share is revoked. Use the
 * platform CSPRNG, not a time-seeded PRNG whose next outputs are predictable
 * after one observed slug.
 */
export function getRandomChars(
  n: number,
  chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
) {
  if (!Number.isInteger(n) || n < 1 || chars.length === 0) {
    throw new Error('getRandomChars requires a positive length and a character set.');
  }

  // Rejection sampling keeps every character equally likely. 256 is not a
  // multiple of 62, so bytes above the largest multiple are discarded.
  const limit = 256 - (256 % chars.length);
  let result = '';

  while (result.length < n) {
    for (const byte of randomBytes(n * 2)) {
      if (byte >= limit) {
        continue;
      }

      result += chars[byte % chars.length];

      if (result.length === n) {
        break;
      }
    }
  }

  return result;
}
