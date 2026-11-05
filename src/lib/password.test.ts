import { describe, expect, test } from 'vitest';
import { checkPassword, hashPassword, needsPasswordRehash } from './password';

describe('password hashing', () => {
  test('hashes at cost 12 and verifies', () => {
    const hash = hashPassword('correct horse battery staple');

    expect(hash.startsWith('$2')).toBe(true);
    expect(checkPassword('correct horse battery staple', hash)).toBe(true);
    expect(checkPassword('wrong', hash)).toBe(false);
    expect(needsPasswordRehash(hash)).toBe(false);
  });

  test('flags an inherited cost-10 hash for rehash without rejecting it', () => {
    const legacy = hashPassword('legacy-password', 10);

    expect(checkPassword('legacy-password', legacy)).toBe(true);
    expect(needsPasswordRehash(legacy)).toBe(true);
  });

  test('treats a malformed hash as needing a rehash', () => {
    expect(needsPasswordRehash('not-a-bcrypt-hash')).toBe(true);
  });
});
