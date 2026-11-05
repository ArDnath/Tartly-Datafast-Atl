import { afterEach, expect, test, vi } from 'vitest';
import {
  decryptProviderSecret,
  encryptProviderSecret,
  rotateProviderSecret,
} from './provider-secrets';

const OLD_KEY = 'old-provider-secret-key-at-least-32-bytes';
const NEW_KEY = 'new-provider-secret-key-at-least-32-bytes';

afterEach(() => {
  vi.unstubAllEnvs();
});

test('encryptProviderSecret stores a prefixed encrypted value that decrypts back', () => {
  vi.stubEnv('APP_SECRET', 'provider-secret-test-key-at-least-32-bytes');

  const encrypted = encryptProviderSecret('rk_test_123');

  expect(encrypted).not.toBe('rk_test_123');
  expect(encrypted.startsWith('enc:')).toBe(true);
  expect(decryptProviderSecret(encrypted)).toBe('rk_test_123');
});

test('decryptProviderSecret keeps plaintext fallback for old stored secrets', () => {
  expect(decryptProviderSecret('whsec_legacy')).toBe('whsec_legacy');
  expect(decryptProviderSecret(null)).toBeNull();
});

test('rotation can read the old key and re-encrypt with the new key', () => {
  vi.stubEnv('APP_SECRET', OLD_KEY);
  const encryptedWithOldKey = encryptProviderSecret('sk_live_rotate_me');

  vi.stubEnv('APP_SECRET', NEW_KEY);
  vi.stubEnv('APP_SECRET_PREVIOUS', OLD_KEY);

  expect(decryptProviderSecret(encryptedWithOldKey)).toBe('sk_live_rotate_me');

  const rotated = rotateProviderSecret(encryptedWithOldKey);

  expect(rotated).not.toBe(encryptedWithOldKey);
  expect(decryptProviderSecret(rotated)).toBe('sk_live_rotate_me');

  // After the rotation window is closed, the new ciphertext still works.
  vi.stubEnv('APP_SECRET_PREVIOUS', '');
  expect(decryptProviderSecret(rotated)).toBe('sk_live_rotate_me');
});

test('without APP_SECRET_PREVIOUS an old ciphertext fails closed', () => {
  vi.stubEnv('APP_SECRET', OLD_KEY);
  const encryptedWithOldKey = encryptProviderSecret('sk_live_rotate_me');

  vi.stubEnv('APP_SECRET', NEW_KEY);
  vi.stubEnv('APP_SECRET_PREVIOUS', '');

  expect(() => decryptProviderSecret(encryptedWithOldKey)).toThrow();
});
