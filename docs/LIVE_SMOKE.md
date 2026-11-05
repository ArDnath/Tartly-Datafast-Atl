# Live operational smoke (local production build)

Date: 2026-11-06
Environment: `next build` + `next start`, local PostgreSQL 17, `EMAIL_OUTBOX=true`,
`PLATFORM_ADMIN_EMAILS=admin-smoke@example.com`. No Resend or Dodo credentials.
All smoke accounts, workspaces, events, sessions, tokens, and audit rows were
deleted afterwards.

## Transactional email

| Flow | Result |
| --- | --- |
| Verification resend | `{ "sent": true }`; link written to `.dev-emails/outbox.log` |
| Verify token | `{ "verified": true }` |
| Password forgot | `{ "sent": true }`; single-use reset link written to outbox |
| Password reset | `{ "ok": true }`; old session revoked by the reset path |
| Login with new password | 200 with `isPlatformAdmin: true` for the allowlisted admin |

This proves the token lifecycle and templates/log transport. It does **not**
prove live Resend delivery or inbox rendering.

## Platform-admin abuse controls

| Step | Result |
| --- | --- |
| `GET /api/admin/accounts?query=target-smoke` | 200; returned the user and workspace with operator fields only |
| Normal user calling the same endpoint | 403 |
| Suspend user | 200; `suspendedAt` and reason stored |
| Existing target session | **401** |
| Target login | **401** `invalid-credentials` |
| Unsuspend user | 200; login works again |
| Suspend workspace | 200; reason stored |
| Event after workspace suspension | **403** `workspace-unavailable` |
| Audit rows | `user.suspended`, `user.unsuspended`, `workspace.suspended`, `workspace.unsuspended` |

The first workspace-suspension attempt still ingested an event: the entitlement
lookup filtered `deletedAt` but not `suspendedAt`. Fixed in `src/lib/entitlements.ts`
and pinned by `src/lib/entitlements.test.ts`. After the fix, the same request
returned 403 before any session or event write.

## One-time setup allowance

Fresh account with no subscription, `workspace.setup_events_count` set to 999:

```text
event 1000 -> 200 accepted; counter 1000
event 1001 -> {"ok":false,"reason":"subscription_required","limit":1000,"used":1000}
counter remains 1000; there is no monthly reset
```

The counter lives on the workspace, not `usage_period`, so an unsubscribed
workspace cannot farm a fresh allowance each month. The smoke account was
deleted afterwards. This closes the "free Starter forever" leak while still
allowing install verification.

## Not covered

- Live Resend delivery and real inbox links.
- Dodo checkout, portal, plan change, and webhook delivery.
- Stripe/Dodo/Lemon Squeezy/Polar/Yolfi live webhooks.
- Browser layout, onboarding motion, and replay recording/masking.
- Neon production restore and deployed load test.
