# Live operational smoke (local production build)

Date: 2026-11-06
Environment: `next build` + `next start`, local PostgreSQL 17, `EMAIL_OUTBOX=true`,
`PLATFORM_ADMIN_EMAILS=admin-smoke@example.com`. No Resend or Dodo credentials.
All smoke accounts, workspaces, events, sessions, tokens, and audit rows were
deleted afterwards.

## Transactional email

| Flow                    | Result                                                       |
| ----------------------- | ------------------------------------------------------------ |
| Verification resend     | `{ "sent": true }`; link written to `.dev-emails/outbox.log` |
| Verify token            | `{ "verified": true }`                                       |
| Password forgot         | `{ "sent": true }`; single-use reset link written to outbox  |
| Password reset          | `{ "ok": true }`; old session revoked by the reset path      |
| Login with new password | 200 with `isPlatformAdmin: true` for the allowlisted admin   |

This proves the token lifecycle and templates/log transport. It does **not**
prove live Resend delivery or inbox rendering.

## Platform-admin abuse controls

| Step                                         | Result                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `GET /api/admin/accounts?query=target-smoke` | 200; returned the user and workspace with operator fields only                       |
| Normal user calling the same endpoint        | 403                                                                                  |
| Suspend user                                 | 200; `suspendedAt` and reason stored                                                 |
| Existing target session                      | **401**                                                                              |
| Target login                                 | **401** `invalid-credentials`                                                        |
| Unsuspend user                               | 200; login works again                                                               |
| Suspend workspace                            | 200; reason stored                                                                   |
| Event after workspace suspension             | **403** `workspace-unavailable`                                                      |
| Audit rows                                   | `user.suspended`, `user.unsuspended`, `workspace.suspended`, `workspace.unsuspended` |

The first workspace-suspension attempt still ingested an event: the entitlement
lookup filtered `deletedAt` but not `suspendedAt`. Fixed in `src/lib/entitlements.ts`
and pinned by `src/lib/entitlements.test.ts`. After the fix, the same request
returned 403 before any session or event write.

## Unpaid ingestion (trial removed)

The one-time setup event allowance was removed with the free trial. A fresh
account with no subscription now rejects every billable event before a session
or event row is written:

```text
event 1 -> {"ok":false,"reason":"subscription_required","limit":0,"used":0}
```

The collector test suite pins this response
(`src/features/analytics/server/send/handler.test.ts`). The workspace can still
create its first website during onboarding through the one-website setup
allowance. **UNVERIFIED:** repeat this against a live deployment after the
change; the previous setup-counter observation is historical and no longer
applies.

## Not covered

- Live Resend delivery and real inbox links.
- Dodo checkout, portal, plan change, and webhook delivery.
- Stripe/Dodo/Lemon Squeezy/Polar/Yolfi live webhooks.
- Browser layout, onboarding motion, and replay recording/masking.
- Self-hosted PostgreSQL/ClickHouse restore and deployed load test.
