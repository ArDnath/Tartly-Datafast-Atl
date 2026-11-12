# Onboarding Specification

Tartly onboarding copies the sibling Tartly app's shell, motion, copy rhythm,
and welcome moment, then adapts the steps to a revenue analytics product. The
first release of this flow asked for a workspace name and photo; that step is
gone. The customer now starts with the thing they actually came to measure.

- **Route:** `/onboarding` (authenticated; redirects to `/login` otherwise)
- **Implementation:** `src/features/onboarding/OnboardingFlow.tsx`,
  `src/features/onboarding/steps/*`, `src/features/onboarding/Onboarding.module.css`
- **Welcome overlay:** `src/features/onboarding/welcome/*`, mounted once by the
  app shell and played over `/app?welcome=1`
- **Motion source:** `../tartly/lib/onboarding/constants.ts`,
  `../tartly/components/app/onboarding/onboarding-transition-outlet.tsx`, and
  `../tartly/components/app/onboarding/welcome-overlay/*`
- **Goal:** a working tracker and a connected revenue source in under two
  minutes, then a single welcome moment over the real dashboard.

---

## 1. Tartly reference

The following behaviour is intentionally copied:

| Tartly (email client) behaviour                  | Reference file                                                       | Tartly implementation                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Full-height centred canvas, 440px content column | `onboarding-step-layout.tsx`, `ONBOARDING_CONTENT_BLOCK_WIDTH = 440` | `.stepPanel { width: min(440px, 100%) }`                                 |
| Logo → title → subtitle → form                   | `onboarding-step-layout.tsx`                                         | `StepHeading`                                                            |
| Directional slide/fade between steps             | `onboarding-transition-outlet.tsx`                                   | `stepForward` / `stepBackward` keyframes                                 |
| 12px offset, 320ms, ease-in-out                  | `ONBOARDING_MOTION_SLIDE_OFFSET`, `..._DURATION_SECONDS`             | same values                                                              |
| 70ms stagger inside a step                       | `onboarding-step-animated-item.tsx`                                  | `Reveal` with `index * 70ms`                                             |
| Back control at top-left, no heavy chrome        | `onboarding-header.tsx`                                              | header back button                                                       |
| Halftone welcome canvas                          | `welcome-halftone-*.ts(x)`, `welcome-halftone-dots.ts`               | copied renderer, particles, dash data, worker fallback, canvas lifecycle |
| Word-by-word welcome title                       | `welcome-overlay.tsx`                                                | same 600ms reveal with 70ms stagger                                      |
| Person chip with brand fallback                  | `welcome-person-chip.tsx`                                            | `WelcomePersonChip` with the Tartly mark                                 |
| One-shot welcome gate                            | `mail-welcome-overlay-gate.tsx`                                      | `AppWelcomeOverlayGate` + `?welcome=1`                                   |
| Reduced-motion support                           | `useReducedMotion`                                                   | `prefers-reduced-motion` media query and a 1.1s hold                     |

The halftone renderer is the real canvas implementation, not a CSS dot field.
The overlay no longer flies its title into a chat preamble because `/app` has
no chat pane; it holds for 2.9 seconds and fades/scale-outs like the reference's
non-flight path.

---

## 2. Step flow

```
/login
  └─ Google sign-in
       ├─ completed workspace or invited membership ──► requested /app URL
       └─ no workspace / incomplete owned workspace ──► /onboarding
                              ├─ Step 1: website URL
                              │    └─ POST /api/onboarding/website
                              │         (creates the invisible workspace + website)
                              ├─ Step 2: install the tracker
                              │    └─ live verification against the event store
                              └─ Step 3: connect a payment provider
                                   └─ POST /api/onboarding/complete
                                        └─ /app?welcome=1
                                             └─ singleton welcome overlay
```

A returning customer resumes at the earliest unfinished step. A completed
workspace is sent straight to `/app`.

### Step 1 — Website URL

- Field: domain or URL (`acme.com`, `https://acme.com/pricing`). The value is
  normalized to a hostname.
- No workspace form. `POST /api/onboarding/website` finds the owner's incomplete
  workspace or creates one from the domain label, then creates the first
  website. The workspace is a real tenant boundary; it is simply not a setup
  question.
- The workspace starts on the Starter plan with an incomplete subscription, so
  the one-website setup allowance allows the first website before payment.
- Signup still creates only the user. The first workspace is a server-side
  side effect of the first activation step.

### Step 2 — Tracker

- Snippet generation comes from `src/features/docs/install-guides.ts`, so the
  onboarding flow, public docs, and website settings cannot drift.
- Framework tabs: Next.js, React, Vite, plain HTML, Astro, Remix.
- Live verification polls `GET /api/websites/:id/onboarding/verify`. It reads
  the event store, not a client-side flag, and never fakes success.
- The customer can continue before the first event arrives; the tracker can be
  verified later in Settings → Websites.

### Step 3 — Revenue

- Provider cards: Stripe, Dodo Payments, Lemon Squeezy, Polar, Yolfi.
- Credentials go to the existing per-website
  `/api/websites/:id/payment-provider-connections` endpoint. Validation,
  encryption, webhook creation, and tenant authorization stay in the payments
  domain.
- The copy states the boundary explicitly: this is the customer's analytics
  revenue integration, never the Tartly platform subscription.
- The customer can finish without connecting a provider.

### Completion — Welcome and `/app`

- `POST /api/onboarding/complete` sets `workspace.onboarding_completed_at`.
  That is what stops the next sign-in from sending the customer back here.
- The client navigates to `/app?welcome=1` with `router.replace`.
- `AppWelcomeOverlayGate` is a single app-wide instance. It latches the query
  flag, lazy-loads the animation chunk, and the overlay removes the flag with
  `history.replaceState` so a refresh does not replay it.
- The overlay is a portal over the real dashboard: opaque canvas, the ported
  halftone dash field, word-by-word **Welcome to Tartly**, and a person chip for
  the signed-in account. It holds for 2.9s (1.1s reduced motion), fades out,
  and unmounts.
- The app shell redirects a signed-in owner with `onboardingRequired` back to
  `/onboarding` instead of rendering a workspace mid-setup.

---

## 3. API contract

| Method | Path                                                    | Purpose                                   | Authorization                              |
| ------ | ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| `GET`  | `/api/workspaces`                                       | List the user's workspaces                | session                                    |
| `POST` | `/api/onboarding/website`                               | Create/reuse workspace + first website    | session, `ADMIN` on the resolved workspace |
| `POST` | `/api/onboarding/complete`                              | Mark the owner's workspace complete       | `OWNER`                                    |
| `GET`  | `/api/websites/:websiteId/onboarding/verify`            | Tracker verification from the event store | `VIEWER` on the website                    |
| `POST` | `/api/websites/:websiteId/payment-provider-connections` | Validate and store a provider connection  | `ADMIN` on the website                     |
| `POST` | `/api/auth/verify`                                      | Session user + `onboardingRequired`       | session                                    |

Every route re-checks workspace/website access on the server. The UI never
creates a workspace from a hidden client ID.

---

## 4. Motion and accessibility

- Step transition: 320ms ease-in-out, 12px directional offset.
- Reveal: 320ms, 70ms stagger per element.
- Welcome: word reveal from 1.1s, 2.9s hold, 340ms title fade, 700ms canvas
  fade, 1.1s teardown.
- Progress bar: 320ms width transition.
- Buttons/inputs: 160ms hover/focus.
- `prefers-reduced-motion: reduce`: entrance/halftone animations disabled,
  progress transition disabled, welcome hold shortened to 1.1s and fade to
  400ms.
- Inputs have labels; errors are text, not colour-only.
- The welcome overlay does not trap focus and has no interaction requirement.
- Live verification status is announced as text, not by colour alone.

---

## 5. Activation events to record (Phase 8)

The UI does not yet send product analytics. When the activation store lands,
record:

- `onboarding_started`
- `workspace_created` (invisible, from the first website step)
- `website_created`
- `tracker_verified`
- `payment_provider_connected` (provider name only)
- `welcome_overlay_shown`
- `onboarding_completed`
- `onboarding_abandoned` (step)

Do not send the snippet, domain, photo, or payment credentials to a third-party
analytics tool.

---

## 6. Remaining

- A visual browser pass (screenshots, keyboard walk-through, reduced-motion
  emulation) still requires a human or a connected browser.
- Email verification is sent at signup and can be resent, but it is not a hard
  gate before onboarding.
- Live provider webhook delivery remains **UNVERIFIED** for every provider
  because this checkout has no provider accounts. See
  `docs/PAYMENT_PROVIDER_CAPABILITIES.md`.
