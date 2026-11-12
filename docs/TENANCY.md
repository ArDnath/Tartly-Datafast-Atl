# Tenant isolation and application structure

This is the authoritative description of how Tartly decides who may read
or change tenant data. If code and this document disagree, the code is wrong.

## The tenant boundary

A **workspace** is the tenant. Every website belongs to exactly one workspace
and every tenant-owned query starts from a website ID that was resolved through
a workspace membership.

```
request
  → parseRequest()                    // session cookie, bearer token, or share token
  → requireWorkspaceAccess(user, workspaceId, minimumRole)
  → requireWebsiteAccess(user, websiteId, minimumRole)
  → canViewWebsite / canUpdateWebsite / canDeleteWebsite
  → tenant-scoped Prisma query (website_id, workspace_id)
```

There is no "installation owner" shortcut. The legacy `isAdmin` flag is **not**
a tenant grant: internal user administration still reads it, but every
website, report, replay, revenue, export, and settings route ignores it.

## Roles

| Action                                       | OWNER | ADMIN | MEMBER | VIEWER |
| -------------------------------------------- | ----- | ----- | ------ | ------ |
| Read workspace / analytics                   | yes   | yes   | yes    | yes    |
| Update website settings                      | yes   | yes   | yes    | no     |
| Create / delete websites                     | yes   | yes   | no     | no     |
| Manage members and invitations               | yes   | yes   | no     | no     |
| Manage integrations                          | yes   | yes   | no     | no     |
| Billing / plan / transfer / delete workspace | yes   | no    | no     | no     |

Enforced in `src/lib/workspace-auth.ts`; the role/action map is unit-tested.
Website helpers live in `src/permissions/website.ts`. The inherited API routes
were migrated by rewriting these helpers rather than editing 100+ route files.

## Website ownership

`website.workspace_id` is the tenant key. New websites always receive one:

- `POST /api/websites` takes a `workspaceId` or resolves the user's single
  OWNER/ADMIN workspace (`getDefaultWorkspaceForUser`).
- The route requires ADMIN on that workspace and enforces the plan website
  limit from `src/lib/plans.ts` via `src/lib/entitlements.ts`.
- `website.user_id` and `website.team_id` remain for reversible migration and
  legacy rows only.

A website with a null `workspace_id` is a pre-migration row. It is reachable
only through the legacy owner/team check. It is never reachable through a
workspace ID, and `requireWebsiteAccess` rejects it.

## Registration and invitations

- **Signup** (`POST /api/auth/register`) creates the user, personal workspace,
  OWNER membership, and initial plan selection in one transaction. A failure
  leaves no orphan user or workspace.
- **Invitations** store only a SHA-512 hash of a one-time token, expire after
  7 days, are single-use, and must be accepted by the invited email address.
  Email delivery goes through `src/lib/email.ts`; the plaintext link is never
  returned in an API response. Without `RESEND_API_KEY`, development writes the
  message to `.dev-emails/outbox.log` (gitignored) instead of the application
  log.
- **Member allowance** comes from the plan (`starter` 1, `pro` 5) and fails
  closed when no plan is selected. Self-service creation of a second owned
  workspace is blocked until platform billing exists, so a user cannot mint
  extra allowances.

## Platform administration

The legacy `role === 'admin'` flag is **not** a workspace grant and is **not**
sufficient for platform administration. `src/lib/platform-admin.ts` requires
both the legacy role and an entry in `PLATFORM_ADMIN_EMAILS`. In production an
empty allowlist disables the legacy user console; workspace roles stay the only
source of tenant authorization.

## Sessions, CSRF, and credentials

- Browsers authenticate with the `rl_session` cookie: random 256-bit token,
  HttpOnly, SameSite=Lax, `Secure` in production, 30-day sliding use window.
  The database stores only a SHA-512 hash plus user ID, expiry, revocation
  time, hashed IP, and user agent (`auth_session`).
- The raw session token is never returned in a login/register response body.
  Non-browser integrations must use an API key, not a browser session.
- Password change and password reset revoke every session for the user.
- Login, signup, password-reset, reset-confirm, and verification-resend
  endpoints use the `rate_limit_bucket` table (atomic
  `INSERT … ON CONFLICT`), so protection does not depend on Redis.
- State-changing requests authenticated by the cookie are rejected when an
  `Origin`/`Referer` header points at another site (`csrf-rejected`).

## Cache keys

Cached values are always keyed by the tenant-owned identifier, never by a
bare session or entity ID:

- `website:${websiteId}`
- `session:${websiteId}:${sessionId}` — the website prefix was added because
  a session UUID alone could otherwise be resolved through another tenant's
  cache entry.
- Public share slugs (`pixel:${slug}`, `link:${slug}`) are intentionally
  public identifiers; they do not grant access to private routes.

## Workspace switching

The UI stores the selected workspace in the `rl_workspace` cookie and filters
the website list and the `/app` revenue overview by it. This is a **display scope only**; every API request
re-checks membership. Clearing the cookie shows all accessible workspaces.

## What is still legacy

- Boards, links, and pixels still use `user_id`/`team_id` ownership. Their
  create endpoints are disabled (`legacyFeatureDisabled`) and they are scheduled
  for removal or a workspace migration, not for new features.
- Team-based website access remains only as a read fallback for rows whose
  `workspace_id` is null. Re-run the backfill and remove the fallback when the
  production copy is verified.
- PostgreSQL row-level security is not enabled. Application-level checks plus
  the static route-boundary test are the current defence. RLS was evaluated and
  deferred: every pooled query would need a transaction-scoped
  `SET LOCAL app.workspace_id` plus a policy on ~39 tables, and a missed
  `SET LOCAL` silently returns zero rows or leaks depending on policy. Revisit
  before enterprise sales, not before launch.
- Account/workspace deletion is a soft delete. Event and replay payload purge
  is a tenant-scoped retention job with a dry run, tracked in Phase 7/10.
- Event/replay storage isolation is by `website_id`; replay payloads are not in
  tenant tables.

## Tests that guard the boundary

- `src/permissions/website.workspace.test.ts` — ten cross-tenant scenarios
  (A cannot view/update/delete B, admin is not a grant, viewer/member limits,
  share tokens are read-only, missing membership fails closed).
- `src/lib/tenant-boundaries.test.ts` — every route under `api/websites`,
  `api/reports`, `api/users`, and `api/workspaces` must call an authorization
  helper or be on the explicit self-scoped allowlist.
- `src/features/auth/server/registration.test.ts` — transaction behaviour and
  duplicate accounts.
- `src/features/workspaces/lib/workspace-invitations.test.ts` — hashing, expiry,
  email matching, member limits, revocation.
- `src/lib/auth-session.test.ts`, `src/lib/auth-cookie.test.ts`,
  `src/lib/auth-tokens.test.ts`, `src/lib/rate-limit.test.ts`,
  `src/lib/csrf.test.ts` — session hashing/expiry/revocation, cookie flags,
  single-use tokens, brute-force limits, cross-site rejection.
- `src/features/analytics/server/queries/session-cache.test.ts` — cached
  sessions are scoped by website.
- `src/features/payments/server/stripe/[websiteId]/webhook/handler.test.ts` and
  `src/features/system/cron/jobs/provider-webhook-cleanup.test.ts` — webhook/job
  writes stay on the website/job they were queued for.
