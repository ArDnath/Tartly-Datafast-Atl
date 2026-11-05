# Tenant isolation and application structure

This is the authoritative description of how RevenueLens decides who may read
or change tenant data. If code and this document disagree, the code is wrong.

## The tenant boundary

A **workspace** is the tenant. Every website belongs to exactly one workspace
and every tenant-owned query starts from a website ID that was resolved through
a workspace membership.

```
request
  → parseRequest()                    // authenticates the bearer token / share token
  → requireWorkspaceAccess(user, workspaceId, minimumRole)
  → requireWebsiteAccess(user, websiteId, minimumRole)
  → canViewWebsite / canUpdateWebsite / canDeleteWebsite
  → tenant-scoped Prisma query (website_id, workspace_id)
```

There is no "installation owner" shortcut. The legacy `isAdmin` flag is **not**
a tenant grant: internal user administration still reads it, but every
website, report, replay, revenue, export, and settings route ignores it.

## Roles

| Action | OWNER | ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| Read workspace / analytics | yes | yes | yes | yes |
| Update website settings | yes | yes | yes | no |
| Create / delete websites | yes | yes | no | no |
| Manage members and invitations | yes | yes | no | no |
| Manage integrations | yes | yes | no | no |
| Billing / plan / transfer / delete workspace | yes | no | no | no |

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
  Email delivery goes through `src/lib/email.ts`; when no provider key is set,
  the link is printed to the server console and returned once to the inviting
  admin so onboarding is still testable.
- **Member allowance** comes from the plan (`starter` 1, `pro` 5) and fails
  closed when no plan is selected. Self-service creation of a second owned
  workspace is blocked until platform billing exists, so a user cannot mint
  extra allowances.

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
  the static route-boundary test are the current defence.
- Event/replay storage isolation is by `website_id`; replay payloads are not in
  tenant tables.

## Tests that guard the boundary

- `src/permissions/website.workspace.test.ts` — ten cross-tenant scenarios
  (A cannot view/update/delete B, admin is not a grant, viewer/member limits,
  share tokens are read-only, missing membership fails closed).
- `src/lib/tenant-boundaries.test.ts` — every route under `api/websites`,
  `api/reports`, `api/users`, and `api/workspaces` must call an authorization
  helper or be on the explicit self-scoped allowlist.
- `src/lib/registration.test.ts` — transaction behaviour and duplicate accounts.
- `src/lib/workspace-invitations.test.ts` — hashing, expiry, email matching,
  member limits, revocation.
