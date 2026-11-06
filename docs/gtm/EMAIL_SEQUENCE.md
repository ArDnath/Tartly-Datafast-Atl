# Lifecycle email sequence

Only transactional email is implemented today: verification, password reset,
workspace invitation, usage warning/limit, and payment failure. The sequence
below is the plan for product email; do not send marketing email without an
unsubscribe path and a lawful basis.

## 1. Welcome (immediately, after signup)

**Subject:** Your Tartly workspace is ready
**Body:** One next step only — add a website. Link to onboarding. No feature
tour, no upsell.

## 2. Install check (day 1, only if no event)

**Subject:** Is the tracker installed?
**Body:** The snippet, the most common reasons it does not fire (CSP, ad
blocker, wrong domain), and a link to the diagnose page/CLI. Stop after one
reminder.

## 3. First event (event-triggered)

**Subject:** Your first event arrived
**Body:** What was captured, what to check next, and the link to the realtime
view. No invented numbers.

## 4. Connect payments (day 2, only if no provider connection)

**Subject:** See which channel produced revenue
**Body:** One provider guide (Stripe, Dodo, Lemon Squeezy, Polar, Yolfi, or the
manual API). Explain that analytics and platform billing are separate.

## 5. First attributed payment (event-triggered)

**Subject:** Your first payment is attributed
**Body:** Revenue, source, landing page, and journey link. If the payment is
unattributed, explain the likely cause instead of claiming success.

## 6. Usage warning (80%)

**Subject:** 80% of this month's events used
**Body:** Used/limit, reset date, upgrade path, and the pause/grace behaviour.
Sent once per period by the usage-notice job.

## 7. Usage limit (100%)

**Subject:** Event limit reached
**Body:** Ingestion pauses after the small grace window, data stays readable,
nothing is deleted, and the plan resets on a date. Upgrade or wait.

## 8. Payment failure (billing webhook)

**Subject:** Payment failed for <workspace>
**Body:** Update the payment method, access state, and the fact that customer
revenue integrations are unaffected.

## 9. Win-back (day 30, only after a real cancellation)

**Subject:** What was missing?
**Body:** One question, one link to a 10-minute call. No discount in the first
email, no guilt copy.

## Rules

- One CTA per email.
- Transactional email never contains marketing.
- Every marketing email has an unsubscribe link and a physical address.
- No fake urgency, no fake countdown, no "your data will be deleted" threats
  that the product does not actually perform.
- Suppress suspended, deleted, and unverified addresses according to policy.
