# Secrets inventory and rotation

Secrets live only in the deployment secret manager or `.env` locally. `.env` is
gitignored and must never be committed. The application never returns a secret
in an API response and the structured logger redacts secret-like keys.

## Inventory

| Secret                                   | Used for                                                                   | Rotation impact                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `APP_SECRET`                             | signs tokens, derives visitor IDs, encrypts analytics-provider credentials | invalidates sessions and requires provider-secret re-encryption |
| `APP_SECRET_PREVIOUS`                    | temporary read-only rotation key                                           | remove after rotation                                           |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | runtime / migrations                                                       | brief connection errors; use Neon credential rotation           |
| `DATABASE_REPLICA_URL`                   | analytics reads                                                            | read path falls back to primary                                 |
| `RESEND_API_KEY`                         | verification/reset/invite/usage email                                      | email delivery stops until updated                              |
| `ERROR_TRACKING_WEBHOOK`                 | optional error collector                                                   | observability only                                              |
| `PLATFORM_ADMIN_EMAILS`                  | platform-operator allowlist                                                | access boundary; change deliberately                            |
| `DODO_PAYMENTS_API_KEY`                  | platform billing (context A)                                               | checkout/portal/cancel stop                                     |
| `DODO_PAYMENTS_WEBHOOK_SECRET`           | verifies platform billing webhooks                                         | webhook deliveries rejected                                     |
| `DODO_*_PRODUCT_ID`                      | plan mapping                                                               | checkout fails closed for unknown products                      |
| Provider connection secrets              | customer revenue integrations (context B)                                  | encrypted per website; rotate per provider                      |
| Website API keys                         | CLI/MCP/developer reads                                                    | hashed at rest; revoke and reissue                              |
| `REDIS_URL`                              | optional cache                                                             | cache misses, rate limits unaffected                            |
| `CLICKHOUSE_URL` / `KAFKA_*`             | optional scale tier                                                        | analytics query path falls back or fails                        |

`STRIPE_WEBHOOK_SECRET`, `LEMONSQUEEZY_WEBHOOK_SECRET`, and
`POLAR_WEBHOOK_SECRET` are legacy fallbacks only. Normal connections store a
per-website encrypted secret.

## Generating values

```bash
openssl rand -hex 32   # APP_SECRET / APP_SECRET_PREVIOUS
openssl rand -base64 32
```

`APP_SECRET` must be at least 32 bytes. The app refuses to start with the
placeholder value.

## Rotating APP_SECRET (provider credentials)

Changing `APP_SECRET` invalidates every session by design. Stored
analytics-provider credentials are encrypted with it, so use the dual-key
window:

1. Generate the new key.
2. Set `APP_SECRET=<new>` and `APP_SECRET_PREVIOUS=<old>` in the secret manager.
3. Deploy and restart the app.
4. Run:

   ```bash
   pnpm rotate:provider-secrets
   ```

   The script scans `payment_provider_connection` and
   `provider_webhook_cleanup_job`, re-encrypts `credentialsRef` and
   `webhookSecretRef`, and prints counts only.
5. Verify one Stripe/Dodo/Lemon Squeezy/Polar/Yolfi webhook reaches a test
   website.
6. Remove `APP_SECRET_PREVIOUS` and restart.
7. Re-run `pnpm audit` and confirm no secret was written to logs.

If the rotation is interrupted, the previous key still decrypts old rows, so
re-running step 4 is safe. Do not remove the previous key until the verification
in step 5 passes.

## Rotating database credentials

1. Create a new role/password in Neon or the database host.
2. Update `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in the secret manager.
3. Deploy to one instance first; watch `/api/health/ready`.
4. Roll out to all instances.
5. Revoke the old credential after the new one is stable.

Migrations use the direct URL; application traffic must use the pooled URL.
Never run `prisma migrate` through PgBouncer.

## Rotating a provider secret

1. Create the new key/secret in the provider dashboard.
2. Update the per-website connection through the settings flow (never in SQL
   with a plaintext value; the app encrypts on write).
3. Point the provider webhook at the endpoint again if the signing secret
   changed.
4. Send a test event and confirm the connection status becomes active.
5. Revoke the old provider key.

## Rotating website API keys

An API key is shown once and stored as a SHA-256 hash. Revoke it in
**Settings → Websites → API keys**, then create a new one. The CLI and MCP
server read the key from the environment and never echo it.

## Incident rules

- If a secret may have leaked, rotate first and investigate second.
- Never paste a secret into an issue, PR, chat, log line, or test fixture.
- If a secret reached git history, rotate it; history rewriting alone is not
  enough.
- Record the rotation date, owner, and affected service in the audit log or
  launch checklist.
