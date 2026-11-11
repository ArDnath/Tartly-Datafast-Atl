/**
 * Platform administration is not the same thing as a workspace role.
 *
 * The legacy `role === 'admin'` flag came from the self-hosted product and must
 * never be a tenant grant. It also must not automatically make someone an
 * operator of the hosted service. Access requires both:
 *
 *   1. the legacy admin role (kept for reversible migration), and
 *   2. an explicit entry in `PLATFORM_ADMIN_EMAILS` (or user IDs).
 *
 * In production, an empty allowlist means nobody is a platform admin. In
 * development/test, legacy admins keep access so local tooling still works.
 */
export function isPlatformAdmin(
  user: { id: string; username: string; role: string } | null | undefined,
) {
  if (user?.role !== 'admin') {
    return false;
  }

  const allowed = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    return process.env.NODE_ENV !== 'production';
  }

  return allowed.includes(user.username.toLowerCase()) || allowed.includes(user.id.toLowerCase());
}
