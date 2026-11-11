# Agent and CLI integration

Tartly exposes three read-only checks so an AI agent or a CI job can verify
an installation without a browser. All three use a **website-scoped API key**;
there is no account-wide token and no way to name another tenant's website.

Create the key in **Settings → Websites → API keys**. The key is shown once.

## HTTP endpoints

| Method | Path                             | Purpose                                     |
| ------ | -------------------------------- | ------------------------------------------- |
| `GET`  | `/api/developer/verify`          | Installed status, event count, last event   |
| `GET`  | `/api/developer/events?limit=20` | Recent pageviews (max 100)                  |
| `GET`  | `/api/developer/diagnose`        | Checks plus a concrete fix for each failure |

Authentication:

```http
Authorization: Bearer <website-api-key>
```

`x-talivia-api-key` is accepted for compatibility with the inherited manual
payments API. The response never contains the key.

## CLI

```bash
pnpm tartly verify   --api-key "$REVENUELENS_API_KEY"
pnpm tartly events   --api-key "$REVENUELENS_API_KEY" --limit 10
pnpm tartly diagnose --api-key "$REVENUELENS_API_KEY"
```

Add `--json` for machine-readable output. `diagnose` exits with status 1 when a
check fails. The origin defaults to `http://localhost:3000`; set
`REVENUELENS_URL` or pass `--url`.

## MCP server

`scripts/tartly-mcp.mjs` is a dependency-free stdio MCP server. It exposes:

- `verify_installation`
- `list_recent_events`
- `diagnose_installation`

Client configuration:

```json
{
  "mcpServers": {
    "tartly": {
      "command": "node",
      "args": ["scripts/tartly-mcp.mjs"],
      "env": {
        "REVENUELENS_URL": "https://tartly.app",
        "REVENUELENS_API_KEY": "<website-api-key>"
      }
    }
  }
}
```

Run it with `pnpm mcp`.

## `/llms.txt`

`GET /llms.txt` returns a short, machine-readable product summary generated from
`src/lib/plans.ts` and `src/lib/brand.ts`. It includes the two plans, the real
install snippet, the developer endpoints, and the rules an agent must follow
(no invented revenue, no fake installation success, no plaintext provider
secrets).

## Installed means installed

`verify` and the onboarding poll only report success after the server stored a
real `website_event` row. A build that renders a green check without that row
is a bug, not a demo mode.

## Limits

- The developer endpoints are read-only.
- `events` omits event properties and caps `limit` at 100.
- API-key usage updates `lastUsedAt`; revoked keys stop working immediately.
- The MCP server reads the key from the environment and never echoes it.
