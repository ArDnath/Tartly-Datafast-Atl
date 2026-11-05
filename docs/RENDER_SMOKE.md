# Rendered-surface smoke

Date: 2026-11-06
Build: local production build (`next build` + `next start`)
Method: HTTP request + rendered HTML title/content inspection with `curl`.
A desktop browser was **not** connected, so this is not a visual or interaction
walkthrough. It proves the routes render and the server returns the expected
status; it does not prove layout, motion, or click behaviour.

## Public surfaces

| Route | Status | Rendered title |
| --- | --- | --- |
| `/` | 200 | RevenueLens — Revenue analytics for indie SaaS |
| `/pricing` | 200 | Pricing \| RevenueLens |
| `/alternatives` | 200 | Compare RevenueLens with other analytics tools \| RevenueLens |
| `/alternatives/plausible` | 200 | RevenueLens vs Plausible \| RevenueLens |
| `/alternatives/fathom` | 200 | RevenueLens vs Fathom Analytics \| RevenueLens |
| `/alternatives/umami` | 200 | RevenueLens vs Umami Cloud \| RevenueLens |
| `/alternatives/simple-analytics` | 200 | RevenueLens vs Simple Analytics \| RevenueLens |
| `/alternatives/datafast` | 200 | RevenueLens vs DataFast \| RevenueLens |
| `/alternatives/talivia` | 200 | RevenueLens vs Talivia \| RevenueLens |
| `/legal` | 200 | Legal \| RevenueLens |
| `/legal/privacy` | 200 | Privacy policy \| RevenueLens |
| `/legal/terms` | 200 | Terms of service \| RevenueLens |
| `/docs` | 200 | Documentation \| RevenueLens |
| `/docs/install` | 200 | Tracker install guides \| RevenueLens |
| `/sitemap.xml` | 200 | — |
| `/robots.txt` | 200 | — |
| `/llms.txt` | 200 | — |

The pricing page rendered exactly `$7.99` and `$14.99`. The legal page rendered
the "Draft for lawyer review" notice. The comparison page rendered the source
link and the competitor name.

## Authenticated surfaces

A fresh account was registered through the real API, then each page was
requested with its session cookie:

| Route | Status |
| --- | --- |
| `/app` | 200 |
| `/onboarding` | 200 |
| `/app/settings` | 200 |
| `/app/settings/billing` | 200 |
| `/app/settings/security` | 200 |
| `/app/settings/workspace` | 200 |
| `/app/settings/websites` | 200 |
| `/app/settings/integrations` | 200 |
| `/app/settings/account` | 200 |
| `/app/settings/preferences` | 200 |
| `/app/settings/activation` | 200 |
| `/app/settings/admin` | 200 (restricted copy for a non-platform-admin) |
| `/app/settings/audit` | 200 (restricted copy for a non-platform-admin) |

`GET /api/admin/accounts?query=smoke` returned **403** for the normal account,
proving the UI route is not the access control. The smoke account/workspace were
deleted afterwards.

## Bug found and fixed

`/app/settings/admin` initially returned **404** even though the page existed:
the `proxy.ts` route allowlist in `src/lib/app-route.ts` did not include
`admin`. Added it and pinned `/app/settings/admin` in
`src/lib/app-route.test.ts`.

## Still unverified

- Visual layout at 360/768/1440 px.
- Onboarding motion, reduced-motion behaviour, and the welcome moment.
- Click-through signup → website → event verification.
- Replay recording/masking in a real browser.
- Email links in a real inbox.

These require a connected desktop browser and, for email, provider credentials.
