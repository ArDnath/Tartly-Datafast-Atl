import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(password: string, rounds = SALT_ROUNDS) {
  return bcrypt.hashSync(password, rounds);
}

export function checkPassword(password: string, passwordHash: string) {
  return bcrypt.compareSync(password, passwordHash);
}

/**
 * Existing hashes created before the cost-12 upgrade still verify. The login
 * handler re-hashes once after a successful check, so no user is locked out.
 */
export function needsPasswordRehash(passwordHash: string) {
  try {
    const rounds = bcrypt.getRounds(passwordHash);

    return !Number.isFinite(rounds) || rounds < SALT_ROUNDS;
  } catch {
    return true;
  }
}
