import { decrypt, encrypt, previousSecret, secret } from '@/lib/crypto';

const ENCRYPTED_PROVIDER_SECRET_PREFIX = 'enc:';

export function encryptProviderSecret(value: string) {
  return `${ENCRYPTED_PROVIDER_SECRET_PREFIX}${encrypt(value, secret())}`;
}

function isEncrypted(value: string) {
  return value.startsWith(ENCRYPTED_PROVIDER_SECRET_PREFIX);
}

function decryptWith(key: string, value: string) {
  return decrypt(value.slice(ENCRYPTED_PROVIDER_SECRET_PREFIX.length), key);
}

/**
 * Decrypt a provider credential with the current key, falling back to
 * `APP_SECRET_PREVIOUS` during a rotation window. Plaintext legacy values are
 * returned unchanged so old installations keep working.
 */
export function decryptProviderSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!isEncrypted(value)) {
    return value;
  }

  try {
    return decryptWith(secret(), value);
  } catch (currentError) {
    const previous = previousSecret();

    if (!previous) {
      throw currentError;
    }

    return decryptWith(previous, value);
  }
}

/**
 * Re-encrypt one stored value with the current key. Returns the original value
 * when the secret is absent or already readable only by the current key.
 */
export function rotateProviderSecret(value?: string | null) {
  if (!value || !isEncrypted(value)) {
    return value ?? null;
  }

  const plaintext = decryptProviderSecret(value);

  if (plaintext === null) {
    return null;
  }

  return encryptProviderSecret(plaintext);
}
