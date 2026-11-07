# Onboarding Specification

Tartly onboarding copies Tartly's shell, motion, copy rhythm, and
welcome moment, then adapts the steps to a revenue analytics SaaS.

- **Route:** `/onboarding` (authenticated; redirects to `/login` otherwise)
- **Implementation:** `src/features/onboarding/OnboardingFlow.tsx`,
  `src/features/onboarding/Onboarding.module.css` (route: `src/app/onboarding/page.tsx`)
- **Motion source:** `../tartly/lib/onboarding/constants.ts` and
  `../tartly/components/app/onboarding/onboarding-transition-outlet.tsx`
- **Goal:** first verified event in under two minutes, without hiding the
  dashboard behind a forced wizard.

---

## 1. Tartly reference

The following behaviour is intentionally copied:

| Tartly (email client) behaviour | Reference file | Tartly implementation |
| --- | --- | --- |
| Full-height centred canvas, 440px content column | `onboarding-step-layout.tsx`, `ONBOARDING_CONTENT_BLOCK_WIDTH = 440` | `.stepPanel { width: min(440px, 100%) }` |
| Logo → title → subtitle → form | `onboarding-step-layout.tsx` | `StepHeading` |
| Directional slide/fade between steps | `onboarding-transition-outlet.tsx` | `stepForward` / `stepBackward` keyframes |
| 12px offset, 320ms, ease-in-out | `ONBOARDING_MOTION_SLIDE_OFFSET`, `..._DURATION_SECONDS` | same values |
| 70ms stagger inside a step | `onboarding-step-animated-item.tsx` | `Reveal` with `index * 70ms` |
| Back button with disabled first step | `onboarding-flow.tsx` | header back button + `previousStep` |
| Welcome hold before the first step | `welcome-animation-auto-leave-effect.tsx` | 4.2s welcome overlay (0.9s reduced motion) |
| Reduced-motion support | `useReducedMotion` | `prefers-reduced-motion` media query |
| Quiet dark palette, one blush signal | `DESIGN.md` | `Onboarding.module.css` tokens |

The halftone welcome field is recreated with a CSS dot field that scales in and
settles behind the wordmark, rather than shipping Tartly's canvas worker.

---

## 2. Step flow

```
/welcome
   ├─ existing workspace? ── yes ──► /website
   └─ no ──► /workspace ──► /website ──► /install ──► /verify ──► /payments ──► /report ──► /done
```

The step list adapts: a user who already has a workspace skips the workspace
step, so the header shows 5 steps instead of 6. The dashboard is linked from
`/done`, `/report`, and the header wordmark; no step is a hard gate.
`/report` links to the real revenue report and never invents numbers: empty
states remain visible until the tracker and a payment provider produce data.

### Step 0 — Welcome

- Brand mark, `Welcome to Tartly`, one-sentence promise.
- Primary: **Get started**. Text: **Skip intro**.
- Auto-advances after 4.2s (0.9s with reduced motion).
- CSS: halftone field `scale(1.08) → 1`, opacity `0 → 1 → 0.42`; wordmark
  `scale(.86) → 1` + fade.

### Step 1 — Workspace

- Fields: workspace name (2–100 chars).
- API: `POST /api/workspaces` → `{ id, name, slug, role: 'OWNER' }`.
- Server: creates `Workspace` + `WorkspaceMembership(OWNER)` in one transaction
  (`createWorkspaceForUser` in `src/lib/workspace-auth.ts`).
- Error: inline, plain language. Slug collision is reported without exposing
  internals.
- Existing workspace: step is skipped (first workspace is selected).

### Step 2 — Website

- Field: domain (`acme.com`, URL input is normalized to a hostname).
- API: `POST /api/websites` with `{ name, domain, workspaceId }`.
- Server: requires `ADMIN` on the workspace, preserves the legacy `userId`, and
  stores `workspaceId`.
- The website is the canonical tenant boundary for events and revenue.

### Step 3 — Install

- Snippet (generated from the real script, not a marketing example):
  ```html
  <script defer src="https://app.example.com/script.js"
          data-website-id="…"
          data-domain="acme.com"></script>
  ```
- Copy button writes the exact snippet; "Copied" state lasts 2s.
- Guidance covers Next.js root layout, plain HTML, ad blockers, and the
  "installed but no events" case.
- **I installed it** → verify; **Skip for now** → payments.

### Step 4 — Verify

- Polls `GET /api/websites/:websiteId/onboarding/verify` every 3s.
- Response: `{ installed, eventCount, lastEventAt }`.
- The endpoint resolves the website through `requireWebsiteAccess`, so it cannot
  be used to probe another workspace.
- Shows a waiting state (spinner), then a confirmed state (check, event count,
  last event time).
- Manual **Check now**, **Open domain**, and **Skip for now**.
- Polling stops as soon as `installed` is true; interval is cleaned up on
  unmount and on step change.

### Step 5 — Payments

- Provider chips: Stripe, Dodo Payments, Polar, Lemon Squeezy.
- **Open payment settings** links to the existing
  `/app/:websiteId/settings#payments` page (the real connection UI).
- **I'll do this later** → done. Payment connection is never a hard gate.

### Step 6 — Done

- Summary: workspace, website, plan (or "Choose a plan in billing").
- **Open dashboard** → `/app/:websiteId`; **Go to workspace** → `/app`.
- Reminds the user where the install guide lives.

---

## 3. API contract

| Method | Path | Purpose | Authorization |
| --- | --- | --- | --- |
| `GET` | `/api/workspaces` | List the user's workspaces | session |
| `POST` | `/api/workspaces` | Create workspace + OWNER membership | session |
| `POST` | `/api/websites` | Create website, optional `workspaceId` | legacy + `ADMIN` on workspace |
| `GET` | `/api/websites/:id/onboarding/verify` | Installation state | `VIEWER` on the website's workspace |

The onboarding flow does **not** use a client-side mock. Every step that can
fail returns a real error from the API and renders it inline.

---

## 4. Motion and accessibility

- Step transition: 320ms ease-in-out, 12px directional offset.
- Reveal: 320ms, 70ms stagger per element.
- Welcome: 640–720ms entrance, halftone 3.2s.
- Progress bar: 320ms width transition.
- Buttons/inputs: 160ms hover/focus.
- `prefers-reduced-motion: reduce`: all entrance/halftone animations disabled,
  progress transition disabled, welcome hold shortened to 0.9s.
- Inputs have labels; errors are text, not colour-only; the current step is
  announced by the visible "N of M · Step" text.
- The welcome overlay is dismissible by button; it does not trap focus.

---

## 5. Activation events to record (Phase 8)

The UI does not yet send product analytics. When the activation store lands,
record:

- `onboarding_started`
- `workspace_created`
- `website_created`
- `tracker_snippet_copied`
- `tracker_verified` (with time since website creation)
- `payment_settings_opened`
- `onboarding_completed`
- `onboarding_skipped` (step)

Do not send the snippet, domain, or payment credentials to a third-party
analytics tool.

---

## 6. Verified in this build (2026-11-04)

Run against local PostgreSQL 17 with the real dev server:

1. `POST /api/auth/login` with the legacy admin account → token.
2. `GET /api/workspaces` → one backfilled workspace.
3. `POST /api/workspaces` → workspace created with OWNER membership (transaction).
4. `POST /api/websites` with `workspaceId` → website row has `workspaceId`.
5. `GET /api/websites/:id/onboarding/verify` → `{ installed: false, eventCount: 0 }`.
6. `POST /api/send` with a browser user-agent → accepted; verify endpoint returns
   `{ installed: true, eventCount: 1, lastEventAt: … }`.
7. `/pricing` and `/onboarding` return 200 and render the expected copy.

A visual browser pass (screenshots, keyboard walk-through, reduced-motion
emulation) still requires a human or a connected browser; the desktop browser
tool was unavailable in this environment.

---

## 7. Remaining (tracked in Phase 8/9)

- Email verification is sent at signup and can be resent, but it is not a
  hard gate before onboarding (implemented in Phase 4).
- Automatic workspace selection / workspace switcher in the app shell.
- Invite step (ADMIN/MEMBER/VIEWER), expiry, revoke.
- Plan choice + billing activation before the dashboard.
- Screenshot/visual regression coverage for the welcome and step transitions.
- MCP/CLI verification endpoint for AI agents.

Completed since the first draft:

- Framework-specific install tabs (Next.js, React, Vite, plain HTML, Astro,
  Remix). Snippets are generated from `src/features/docs/install-guides.ts`,
  unit-tested, and labelled **untested at runtime** until a real app is run.
- First-report step links to the real revenue report.
- Analytics activation metrics and the internal, platform-admin-only funnel
  view at `/app/settings/activation`.

