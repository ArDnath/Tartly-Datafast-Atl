import type { Auth } from '@/lib/types';

/**
 * Platform-admin user management. Local user administration is not a tenant
 * grant; only the platform-admin allowlist may list or create accounts.
 */
export async function canCreateUser({ user }: Auth) {
  return user?.isPlatformAdmin ?? false;
}

export async function canViewUser({ user }: Auth, viewedUserId: string) {
  if (!user) {
    return false;
  }

  if (user.isPlatformAdmin) {
    return true;
  }

  return user.id === viewedUserId;
}

export async function canViewUsers({ user }: Auth) {
  return user?.isPlatformAdmin ?? false;
}

export async function canUpdateUser({ user }: Auth, viewedUserId: string) {
  if (!user) {
    return false;
  }

  if (user.isPlatformAdmin) {
    return true;
  }

  return user.id === viewedUserId;
}
