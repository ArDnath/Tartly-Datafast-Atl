# Harvest note — onboarding, dashboard and upgrade UX

**Status:** read-only, completed 2026-11-14. No source, reference, test or build
artefact was modified, and no build, test, dev server or account was run. Counts
and states are read from code and completed research, not a timed session.

**Scope:** `src/features/onboarding/**`, `src/features/marketing/**`, `src/features/analytics/workbench/**`, `src/features/billing/**`, `src/features/websites/**`, the local references, and the public flows in `docs/market-intelligence/LIVE_PRODUCT_RESEARCH.md`.

**License classes:** **A** permissive (MIT/BSD), **B** copyleft or network
copyleft, **C** proprietary or unclear. DataFast and Plausible have no local
source; only public UX patterns are compared. DataGoat is an MIT reimplementation
of DataFast's dashboard pattern, cited only where its own code is the evidence.

## 1. What this app does today

The landing page already collects the domain and carries it through Google
sign-in (`HeroSection.tsx:209-215`; `signup/handoff.ts:31-58`), so the first
onboarding step is a confirmation, not a re-entry.

| #   | Screen                    | Required decision                                     | Evidence                                                    |
| --- | ------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Landing hero              | Domain, then `Start tracking`                         | `HeroSection.tsx:209-246`                                   |
| 2   | Login                     | Continue with Google                                  | `LoginForm.tsx:56-89`                                       |
| 3   | Onboarding 1/3 — website  | Confirm the prefilled domain                          | `WebsiteStep.tsx:24-65`                                     |
| 4   | Onboarding 2/3 — tracker  | Manual snippet or AI agent; framework tab             | `TrackerStep.tsx:67-101`; `InstallExperience.tsx:342-391`   |
| 5   | Onboarding 3/3 — payments | Provider, API key, store ID; skipping is not labelled | `PaymentStep.tsx:142-283`                                   |
| 6   | Paywall or checkout       | Plan, interval, traffic tier                          | `BillingPaywall.tsx:107-271`; `CheckoutHandoff.tsx:179-211` |
| 7   | Dashboard                 | Date range, breakdown sort, section                   | `WebsitePage.tsx:11-51`; `WebsitePanels.tsx:748-815`        |

**Count:** six screens after landing and eight to ten decisions; DataFast four and
three, Umami three or four. The extra screen is the plan gate.

- Real framework detection, a first-party install for CSP-blocked sites, a safe
  AI-agent prompt, a revenue-first metric order, an honest empty portfolio, and
  self-serve cancellation with an exact end date
  (`InstallExperience.tsx:83-102,174-278`; `preflight.ts:156-223`;
  `install-guides.ts:550-615`; `useWebsiteOverviewMetrics.ts:37-93`;
  `BillingSubscriptionPanel.tsx:218-224,330-351`).

### 1.1 Critical finding: first-run verification cannot succeed before payment

`TrackerStep` polls `/websites/:id/onboarding/verify` every five seconds and
tells the customer "This check refreshes every five seconds" and "Open your site
once after deploying the script" (`TrackerStep.tsx:33-63,65`;
`InstallExperience.tsx:497-505`). The verify handler counts rows in
`website_event` (`onboarding/verify/handler.ts:32-44`). But the collector rejects
every billable event from an unpaid workspace with
`reason: 'subscription_required'` (`send/handler.ts:263-283`), and pageviews,
custom events, link clicks and pixel events are all billable
(`lib/usage.ts:113-117`). `plans.ts` locks ingestion until a subscription is
active (`plans.ts:128-136`).

Therefore the first-run tracker step can never show "Tracker connected": it
shows "Waiting for the first event" forever while the server discards the
evidence. A correct install looks broken at the one moment the customer is
watching. The two decisions — setup before payment, and ingestion gated on
payment — are individually reasonable but incompatible; the fix need not change
billing (§4.1).

## 2. Reference comparison

### 2.1 First-run path and required decisions

| Product                     | Path after landing                                                           | Screens      | Decisions                                                        | Gate to first data                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **DataFast**                | signup → install → connect provider → revenue report                         | 4            | account, install, provider                                       | 14-day no-card trial; events flow before payment (`LIVE_PRODUCT_RESEARCH.md` §13)                                     |
| **Talivia** (MIT)           | login → `/app/new` stepper (details → tracking → revenue) → site dashboard   | 4-5          | account, website details, install, provider                      | trial in the live product; wizard ends at `/app/${websiteId}` (`References/talivia/.../WebsiteOnboardingPage.tsx`)    |
| **Umami** (MIT)             | signup → add website (name + domain) → copy script → dashboard               | 3-4          | account, name/domain, install                                    | free 100k events; no verification (`WebsiteAddForm.tsx`, `WebsiteTrackingCode.tsx`)                                   |
| **Plausible** (public only) | register → add site → add script → verify integration → dashboard            | 4-5          | account, site, install                                           | 30-day no-card trial (`LIVE_PRODUCT_RESEARCH.md` §1)                                                                  |
| **minilytics** (MIT)        | deploy → login → add site → install → dashboard                              | 4-5 + deploy | account, site, install, provider                                 | self-host; no hosted trial (`Sites.tsx`, `Dashboard.tsx`)                                                             |
| **pixelmoth** (MIT)         | deploy → install → connect Dodo → dashboard                                  | 3-4 + deploy | site, install, provider                                          | self-host; no hosted trial (`README.md`)                                                                              |
| **This app**                | domain → login → website → tracker → payments → paywall/checkout → dashboard | 6            | domain, account, install, provider + key, plan + interval + tier | no trial; paywall after setup; ingestion locked until paid (`OnboardingFlow.tsx:369-375,449-482`; `plans.ts:128-136`) |

The app no longer asks for the domain twice; it is slower because install and
provider credentials come before the price, and verification waits for payment.

### 2.2 Install step

| Axis         | DataFast                                     | Talivia / Umami              | Plausible                                 | minilytics / pixelmoth                                                                   | This app                                                                      |
| ------------ | -------------------------------------------- | ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Detection    | Public "2 minutes"; detection **UNVERIFIED** | Generic script; no detection | Docs cover platforms; no detection stated | Prompt names frameworks; plain script                                                    | Real host detection + framework guide (`preflight.ts`)                        |
| Modes        | Unknown                                      | Standard                     | Standard                                  | Standard                                                                                 | Standard + first-party proxy for CSP                                          |
| Verification | Data arrival                                 | None / none                  | "Verify the integration" docs             | `first_event_at` / none                                                                  | Real event-store polling — **broken pre-payment**                             |
| Recovery     | Docs                                         | None                         | Docs                                      | "Nothing showing up?" + open-site link (`InstallPage.tsx:300-365`)                       | CSP preflight, copy diagnostic, re-check; **no open-site link, no checklist** |
| AI prompt    | MCP/CLI advertised                           | None                         | None found                                | minilytics: install + payment metadata + identify + goals + report (`aiPrompt.ts:1-100`) | Good install prompt; no payment wiring or goal steps                          |

### 2.3 Empty states and the first dashboard

- **DataFast / DataGoat:** a compact "No visitors in this period yet" banner above
  the KPI row with a direct "Install the script" action
  (`References/datagoat/.../OverviewDashboard.tsx:605-631`): visible where the
  customer is already looking.
- **Talivia / Umami / Plausible / minilytics:** Talivia's `WebsiteFirstRunPanel`
  returns null; the others show "No data available.", a public demo, or a
  self-host empty list. pixelmoth was not inspected.
- **This app:** the empty _portfolio_ is handled well by `WebsiteFirstRunPanel`,
  but the post-onboarding first dashboard is not. The customer lands on the
  portfolio, not the new site. A site card with no chart falls back to 14 zero
  points and always draws the line (`AppEntryPage.tsx:174-181,230-239`) — a
  fabricated series. The website page renders a 471px zero-valued hero with no
  inline explanation; the only help is the floating `TrackerReminder`
  (`WebsitePage.tsx:19-44`). The payments tab says "No payments yet" with no
  action (`WebsitePaymentsList.tsx:74-82`), and the reminder covers only the
  tracker and is hidden while `requiresPayment` (`TrackerReminder.tsx:59-65`).

### 2.4 Upgrade, paywall and cancellation

| Product      | Trial / free gate                                        | Plan comparison                                                | Cancellation                                     |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| DataFast     | 14-day no-card trial                                     | Two tiers, traffic slider                                      | Self-serve per public copy (**UNVERIFIED**)      |
| Plausible    | 30-day no-card trial                                     | Four tiers + enterprise                                        | Self-serve                                       |
| Umami        | Free 100k events/month                                   | Usage-based Pro                                                | Self-serve                                       |
| Talivia      | 14-day trial in the live product                         | Founding price; one plan                                       | Not documented publicly                          |
| minilytics   | Self-host; paid hosted plan                              | Single plan / lifetime                                         | Email support (`Billing.tsx:97-101`)             |
| pixelmoth    | Self-host; no billing                                    | None                                                           | N/A                                              |
| **This app** | **No trial, no free tier; paywall on first `/app` load** | **Two plans, annual toggle, traffic slider; strongest in set** | **Self-serve, exact end date; strongest in set** |

The app's plan comparison and cancellation are the best in this set; the timing
is weak. The plan is not in onboarding, the payments step reads as mandatory, and
the paywall arrives after the tracker install and provider key. DataFast avoids
this with a no-card trial; getopen.so states the exact charge date before signup.
This app has neither, so the transition must be explicit. A no-card trial is table
stakes, but it is a commercial decision: `plans.ts:1-10` and the legal copy forbid
one.

### 2.5 Dashboard hierarchy and mobile

| Product                | Above the fold                                                                                  | Revenue + traffic                                                             | Definitions        | Mobile                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------- |
| DataFast / DataGoat    | KPI row → main chart → breakdown cards                                                          | Revenue KPI + dual chart + revenue per source                                 | Tooltips           | KPI row wraps; cards stack                                  |
| Umami                  | Traffic KPIs → charts → tables                                                                  | Traffic only; revenue events manual                                           | Tooltips           | Tables collapse                                             |
| Plausible              | Traffic KPIs → chart → sources/pages                                                            | Traffic only; revenue goals event-based                                       | Tooltips           | Cards stack                                                 |
| Talivia (upstream)     | Workbench + revenue-attribution pages                                                           | Yes                                                                           | Tooltips           | Workbench shell                                             |
| minilytics / pixelmoth | Revenue-first KPIs / journey                                                                    | Yes                                                                           | Tooltips / minimal | Responsive                                                  |
| **This app**           | **Revenue, revenue/visitor, conversion, visitors, bounce, duration, online → 471px dual chart** | **Yes: dual-axis chart, four breakdown cards with a visitors/revenue toggle** | **KPI tooltips**   | **2-column metric strip, stacked cards, collapsing tables** |

The hierarchy is correct and ahead of the traffic-first peers. Two smaller gaps:
no always-visible chart legend, and breakdown cards default to visitors rather
than revenue (`DashboardBreakdownPanel.tsx:25-33`).

### 2.6 Copy and trust

This app is the cleanest in the set on trust: no invented customers, counts,
testimonials or urgency, and the landing's "interactive demo" is labelled
illustrative (`HeroSection.tsx:30-65`; `LandingPage.test.tsx:149-156`). DataFast's
"28,285 users" and Plausible's subscriber count are company-reported, not patterns
to copy; Talivia and Umami use conventional claims, and minilytics' email-only
cancellation is the only friction found.
The one copy gap is the plan. "Finish setup" is followed by "Subscription
required. Choose a plan to activate this workspace."
(`OnboardingFlow.tsx:338-375`; `AppBillingGate.tsx:74-85`;
`BillingPaywall.tsx:111-121`). The words are honest; the sequence is a surprise.

### 2.7 Limits of this comparison

- No flow was executed. DataFast and Plausible were compared from public pages
  recorded in `LIVE_PRODUCT_RESEARCH.md` (2026-11-14), not accounts. Their
  detection, trial and cancellation behaviour is **UNVERIFIED** where unstated.
- Mobile behaviour is read from the design-language extraction and CSS
  breakpoints, not a device. The paywall, onboarding and chart were not rendered.
- The pre-payment defect is proved from the entitlement gate and verify handler,
  not by sending a request. The snippet check assumes the page HTML is readable by
  the existing safe-fetch preflight; a tag manager may not expose the tag in the
  first response, so "not found" must mean "not visible here", not "broken".
- The no-trial decision is the owner's. This note records its UX cost but does not
  recommend reversing it without `docs/PRICING_ECONOMICS.md`.

## 3. Decision table

| Change                                                                                                     | Best source                                                               | License class | Adopt / reimplement / reject     | Why                                                                                                                                  | Target file                                                                                              | Acceptance test                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Honest pre-payment install state: check the deployed snippet, not the event store, while `requiresPayment` | This repo's gate (`send/handler.ts:263-283`; `TrackerStep.tsx:33-63`)     | A             | Reimplement                      | The UI promises live verification the collector refuses before payment; a correct install looks broken                               | `TrackerStep.tsx`, `InstallExperience.tsx`, `onboarding/verify/handler.ts` (or move the plan step first) | An unpaid workspace shows a definite "Snippet found" / "Not found" and "Events start after checkout"; it never waits forever. A paid workspace still reaches "Tracker connected" within 5s |
| Land the finished first run on the new site's dashboard, not the portfolio                                 | Talivia reference finish                                                  | A             | Adopt pattern                    | A new customer has one site and needs the revenue screen, not another click                                                          | `OnboardingFlow.tsx:369-375`; `next-path.ts`                                                             | After finish the URL is `/app/{websiteId}`, the site header is visible, and the welcome overlay plays once                                                                                 |
| Inline zero-event banner above the KPI row                                                                 | DataGoat `OverviewDashboard.tsx:605-631`                                  | A             | Reimplement                      | The only help today is a floating reminder; an empty 471px chart needs the next action in the content column                         | `WebsitePage.tsx`, `WebsiteChart.tsx` or `WebsiteMetricsBar.tsx`                                         | A zero-event site shows one sentence, install action and open-site link above/inside the hero; it disappears after the first event                                                         |
| Remove the fabricated flat line on a site card with no chart data                                          | This repo (`AppEntryPage.tsx:174-181,230-239`)                            | A             | Fix (empty state)                | The fallback 14 zero points always draws a blue line; it is a fake series                                                            | `AppEntryPage.tsx`                                                                                       | No chart data renders "Waiting for the first visit", not a flat line; real zero days still render the real series                                                                          |
| Make the plan an explicit, priced step or persistent summary before the final action                       | openanalytics "plan last" concept (`onboarding-flow.tsx:28-45`)           | B (concept)   | Reimplement with `plans.ts` data | The customer does the work, presses "Finish setup", then meets the plan; that reads as bait-and-switch                               | `OnboardingFlow.tsx`, `lib/steps.ts`, `BillingPaywall.tsx`                                               | Before the final action the customer sees plan, price, interval and tier from `plans.ts`; the step count matches                                                                           |
| State that payments can be finished later; label the skip path                                             | openanalytics concept; DataGoat "recommended" (`InstallPage.tsx:368-398`) | B / A         | Reimplement copy                 | The screen has only "Back" and "Finish setup"; a customer without a live key cannot tell whether skipping is allowed                 | `PaymentStep.tsx:261-279`                                                                                | The screen says a provider can be added later; the customer can finish without one; the dashboard later reminds them                                                                       |
| Add "Open {domain}" and "Nothing showing up?" to the install status                                        | DataGoat `InstallPage.tsx:300-365`                                        | A             | Reimplement                      | CSP preflight and copy-diagnostic exist, but common failures are not where the customer waits                                        | `InstallExperience.tsx:485-531`                                                                          | An unverified install shows an open-site link and a disclosure with the five common causes, keyboard accessible                                                                            |
| Extend the AI-agent prompt with revenue wiring and a completion report                                     | minilytics `aiPrompt.ts:1-100`                                            | A             | Reimplement                      | The prompt installs the tracker but not the session id in server-created checkouts, and asks for no change report                    | `install-guides.ts:550-615`                                                                              | The prompt covers checkout metadata, what not to touch, and what to report; the prompt test asserts it                                                                                     |
| Default the breakdown sort to revenue, with visitors one click away                                        | This repo (`DashboardBreakdownPanel.tsx:25-33`)                           | A             | Adopt                            | The promise is revenue attribution, but the first breakdown opens sorted by visitors                                                 | `DashboardBreakdownPanel.tsx`                                                                            | The source card opens by revenue; the toggle still reaches visitors                                                                                                                        |
| Public live demo / no-card trial                                                                           | Plausible, DataFast (public patterns)                                     | B / A         | Reject for this phase            | A live demo needs a seeded tenant and privacy review; the trial is owner-fixed off (`plans.ts:1-10`); both are larger than a UX pass | —                                                                                                        | N/A: revisit with `PRICING_ECONOMICS.md`; a live demo needs a seeded demo workspace                                                                                                        |

## 4. Three highest-impact UX changes

**4.1 Make the pre-payment install state honest — M.**
Branch the tracker step on `requiresPayment`: check the deployed snippet (extend
the preflight that already fetches the page and detects the first-party script to
detect the standard `data-website-id` tag), show "Snippet found" / "Not found",
and state "Events start after checkout." Keep the real event-store check for paid
workspaces; if the owner wants real verification before payment, move the
plan/checkout before the tracker step instead, never both.
**Components:** `TrackerStep.tsx`, `InstallExperience.tsx`,
`onboarding/verify/handler.ts`, `preflight.ts`.
**Acceptance:** unpaid workspaces never show a perpetual "Waiting for the first
event"; after checkout the dashboard shows the first event. A failed snippet check
says so and offers the guide, not a fake success.

**4.2 Make the first dashboard the site, and make zero data explain itself — M.**
Route the completed first run to `/app/{websiteId}`, keeping the single welcome
overlay. Replace the silent zero chart with an inline "No visitors yet" panel
above the KPI row: one sentence, "Open your site", "Finish setup", and the live
verification state. Remove the fabricated zero line from the portfolio card.
**Components:** `OnboardingFlow.tsx` (destination), `WebsitePage.tsx` /
`WebsiteChart.tsx` (zero state), `AppEntryPage.tsx` (empty chart), reusing
`InstallExperience` and `WebsiteFirstRunPanel` language.
**Acceptance:** after setup the customer sees their domain, revenue KPIs and a
finish-install action; with no events the page says why and what to do; with a
first event the banner disappears and the chart is real.

**4.3 Make the plan an explicit, priced step and make skipping payments clear — M.**
Add a visible plan summary (name, price from `plans.ts`, interval, traffic tier)
before the final action, as a fourth step or a persistent review block on the
payments step. Add an explicit "Finish without connecting" path and say the
provider can be added later. After payment, keep a "Connect payments" line in the
setup reminder so the skipped step is not lost.
**Components:** `OnboardingFlow.tsx`, `lib/steps.ts`, `PaymentStep.tsx`,
`BillingPaywall.tsx`, `TrackerReminder.tsx`.
**Acceptance:** before the final action the customer can state the plan and price
without opening `/pricing`; a customer with no provider key can finish and is told
so; the reminder distinguishes tracker and payments.
