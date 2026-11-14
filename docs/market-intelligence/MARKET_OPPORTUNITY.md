# Market Opportunity and Positioning

**Access date for all market data:** 2026-11-14.
**Inputs:** `LIVE_PRODUCT_RESEARCH.md`, `COMPETITOR_PRICING.md`,
`SOURCE_REGISTER.md`. Prices are the owner's decisions and are only _tested_
against market anchors here; this document does not set them.

**No number in this document is a revenue forecast.** Every market figure is
labelled with its source and evidence type in the two companion files. Where a
figure does not exist, the text says Undisclosed.

---

## 1. Executive answer

1. **The category is validated, the promise is not unique.** "Connect traffic to
   payments and show which channel makes money" is already the live positioning
   of DataFast, Talivia, trckable and getopen.so. We are entering a real,
   occupied niche — not creating one.
2. **The incumbents with paid scale do not do provider-level attribution.**
   Plausible (22,000+ paying subscribers, company-reported) and Fathom
   ("thousands" of paying customers, company-reported) are traffic analytics.
   Plausible's own docs say payment webhooks cannot be linked to the visit.
3. **The sub-$15 revenue-attribution band is thin and early-stage.** DataFast
   $9, getopen $9, Talivia $9.99 founding, trckable $5 early price. None of them
   publishes paying-customer counts. This is where a small competitor can win.
4. **The fight is not price alone.** DataFast already sits at $9 with five
   payment providers and an MCP server. Undercutting it by $1 is not a strategy.
   The defensible combination is: lower price **+ more sites** + session replay +
   faster first-run to revenue.
5. **Our fixed $7.99 / $14.99 model is at the bottom of the market band and is
   credible** — but only if the plans publish a traffic allowance and the Starter
   tier includes attribution. Margin must be proven in
   `docs/PRICING_ECONOMICS.md` before launch.

---

## 2. Market map — three layers, three buyers

| Layer                            | Products                                                                              | Buyer                                    | Price band | What the buyer is really buying            |
| -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------ |
| Privacy web analytics            | Plausible, Fathom, Simple Analytics, Pirsch, Umami, Matomo, Cloudflare                | Site owner, agency, public sector        | $0–$26     | A trustworthy, simple pageview dashboard   |
| Revenue-first web analytics      | DataFast, Talivia, trckable, getopen.so, (self-host: DataGoat, Minilytics, Pixelmoth) | Indie founder, solo SaaS, micro-agency   | $5–$20     | "Which channel produced paying customers?" |
| Product / subscription analytics | PostHog, Mixpanel, Amplitude, June, Heap, ChartMogul, Baremetrics                     | Product team, finance/revops, enterprise | $69–$100+  | Behaviour, activation, MRR, churn          |

Our product belongs in the **middle layer**. The top layer sets the price
ceiling for "traffic" and gives away a lot for free. The bottom layer sets the
price ceiling for "revenue" and is 5–10× more expensive. The middle layer is
where a $7.99–$14.99 product can exist.

---

## 3. What is actually proven (and what is not)

### Observed in this pass (supply side)

- The market offers analytics at $5–$20/month: eight products publish entry
  prices in that band (Pirsch $6, trckable $5, Plausible $9, DataFast $9,
  getopen $9, Talivia $9.99, Fathom $15, Simple Analytics $15).
- Revenue attribution is commercially offered: four live products sell it
  (DataFast, Talivia, trckable, getopen) with documented payment-provider
  integrations. This proves supply, not demand; none of them publishes paying
  customer counts.
- No-card trials are the norm: Plausible (30d), Pirsch (30d), Simple Analytics
  (14d), Umami (14d), DataFast (14d), Talivia (14d), Matomo Cloud; trckable and
  Cloudflare use a no-card free plan instead of a trial.
- Annual pricing at two months free (≈17%) is the norm (Plausible, Fathom,
  Matomo, DataFast, Simple Analytics, getopen).
- Open-source distribution works as a top of funnel: Umami 40,141 stars and 30M+
  downloads (downloads company-reported); Plausible 29,845 stars; PostHog 40,781
  stars; Matomo 22,026 stars (all star counts verified via GitHub API).

### Not proven — do not assume

- **That stars, downloads or "users" convert to paid.** Umami has the largest
  community and does not publish cloud customer counts. DataFast's "28,285
  users" is a marketing-page count, not paying customers.
- **That cheaper always wins.** Mixpanel/Amplitude give away 1M–2M events/month
  free; Cloudflare gives traffic analytics away at $0. Price only wins when the
  paid feature (attribution) is the reason the buyer came.
- **That the revenue-attribution niche is large.** None of the four live
  revenue-first products publishes customer counts. The niche is verified as
  _existing_, not as _big_.
- **That our onboarding is faster.** No timing was measured in this pass. Any
  "set up in X minutes" claim must be measured on the built product first.

---

## 4. Segments and where a small competitor can win

### 4.1 Solo founder / indie hacker (primary)

- **Job:** "I post on X/Reddit/Product Hunt. Which of those actually produced the
  $19 subscription?"
- **Current options:** DataFast $9 (10k events, 1 site), getopen $9 (50k events,
  1 site), Talivia $9.99 (unlimited sites, founding price), trckable free (1
  site) or $5 early (5 sites).
- **Gap:** at $7.99, **if replay is included at Starter**, we would be the cheapest
  plan under $10 that combines attribution, replay and more than one site
  (trckable's $5 early price gives 5 sites and attribution but no replay;
  DataFast and getopen give 1 site at $9). That is a concrete, checkable
  difference, but it depends on a product decision that is not yet made.
- **Evidence for the gap:** Plausible/Fathom/Simple/Pirsch do not do
  provider-level attribution; Umami requires manual revenue events; the products
  that do attribute start at $5–$9 but with 1 site (DataFast, getopen, trckable
  free).

### 4.2 Micro-SaaS with a few products (primary for Pro)

- **Job:** "I have 3–5 small products and one payment account. Show me revenue by
  channel across all of them without paying per site."
- **Current options:** Fathom $15 for 50 sites but no attribution; Plausible $14
  for 3 sites; DataFast $19 for 30 sites; getopen $19 for 5 sites; trckable $29
  for unlimited (early $5 for 5).
- **Gap:** **20 sites at $14.99 with attribution** is unique in the observed set.
  The closest is DataFast Growth at $19 (30 sites).
- **Risk:** high-traffic products can arbitrage a flat site count. Cap events and
  state the over-limit behaviour.

### 4.3 Small agency (secondary)

- **Job:** "I run analytics for 10–20 client sites and need a dashboard per client
  without enterprise pricing."
- **Current options:** Fathom 50 sites at $15 (no attribution), Plausible 10 sites
  at $19, DataFast 30 sites at $19.
- **Gap:** same as 4.2, plus white-label/shared links. Plausible has white-label
  at enterprise; nobody in the sub-$20 band advertises agency white-label with
  attribution. **Inferred**, not verified as a paid demand signal.

### 4.4 Self-hoster who now wants managed

- **Job:** "I ran Umami/Plausible/trckable myself; I want the same data without
  the server."
- **Evidence:** every major open-source product in this set runs a paid cloud
  (Plausible, Umami, Matomo, trckable, getopen, Talivia). The pattern is proven;
  the conversion rate is Undisclosed.
- **Gap:** an import path from Umami/Plausible would lower switching cost. This
  is a product bet, not a verified demand.

### 4.5 Non-technical founder (underserved, but hard)

- Every self-serve tool still asks for a script tag. Cloudflare is the only
  zero-code path and has no revenue data.
- **Gap:** framework-specific install snippets, WordPress/Shopify plugins and an
  install-verification screen. Plausible and Matomo have WordPress plugins;
  DataFast markets "install in 2 minutes". This is an onboarding gap we can
  exploit without changing the analytics engine.

---

## 5. Positioning options (all grounded in observed facts)

The owner's fixed promise: _connect your site, connect your payments, see which
channels make money._ Below are three ways to sharpen it. Each is a hypothesis to
test, not a claim of superiority.

### Option A — "The cheapest way to see which channel pays" (price-led)

- Claim: revenue attribution from $7.99, with replay included.
- Evidence: DataFast $9, getopen $9, Talivia $9.99, trckable $5 early.
- Risk: a $1 gap is easy to copy; DataFast has founder distribution and an MCP
  story. Price alone will not defend the position.

### Option B — "Revenue analytics for people who ship alone" (audience-led)

- Claim: built for solo founders and micro-SaaS, not agencies or enterprises.
- Evidence: June explicitly excludes sub-$1M-ARR companies; Heap/Amplitude are
  enterprise; even Plausible's cheapest plan is 1 site and no attribution. The
  indie buyer is served, but mostly by early-stage products.
- Risk: the audience is price-sensitive and churns; support load per dollar is
  high.

### Option C — "Traffic, payments and replay in one place, at indie prices"

(combination-led)

- Claim: the only sub-$15 plan with attribution **and** 20 sites **and** session
  replay.
- Evidence: Talivia has replay + attribution but no published multi-site price;
  Umami has replay but no provider attribution; DataFast/Plausible have no
  replay; Fathom has sites but no attribution. No observed product combines all
  three under $15.
- Risk: replay storage is the largest cost driver; margin must be proven before
  promising it on the Starter tier. If replay is Pro-only, the claim weakens.

**Recommendation to the master:** lead with **C**, price-anchor with **A**, and
use **B** for copy and channel selection. Do not claim "cheapest" without a dated
comparison and a legal check.

---

## 6. Price architecture test for the two fixed plans

The owner has fixed **Starter $7.99 / 1 website** and **Pro $14.99 / up to 20
websites**. Test them against these anchors (full table in
`COMPETITOR_PRICING.md`):

| Test                                   | Result                                                                                                       | Evidence                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Is $7.99 below the indie median entry? | Yes. Median observed entry is $9 (Plausible, DataFast, getopen); cheapest is $5–$6 (trckable early, Pirsch). | Pricing pages                       |
| Does $7.99 buy attribution elsewhere?  | Yes, at $5–$9.99 (trckable, DataFast, getopen, Talivia). So we must match features, not just price.          | Pricing pages                       |
| Is $14.99 for 20 sites competitive?    | Yes. Plausible $14 = 3 sites; getopen $19 = 5; DataFast $19 = 30; Fathom $15 = 50 but no attribution.        | Pricing pages                       |
| Is there a hidden meter risk?          | Yes. Every paid competitor meters events/pageviews/sessions. Our plans must publish an allowance.            | All pricing pages                   |
| Is annual at two months free expected? | Yes, market norm.                                                                                            | Plausible, Fathom, Matomo, DataFast |
| Is a no-card trial expected?           | Yes for indie; 7 of 11 self-serve products offer it.                                                         | Pricing pages                       |

**Open question the owner must answer before launch:** what monthly event or
pageview allowance does each plan include, and what happens at the limit? Without
that, the price comparison is not like-for-like and the margin cannot be
calculated. Pausing collection (getopen, PostHog) is the current market
behaviour and avoids surprise bills.

**Do not** add a third plan, a free tier, or annual pricing until
`docs/PRICING_ECONOMICS.md` proves the margin. The market offers all three, but
the owner's model is deliberately two plans.

---

## 7. Risks and how to watch them

| Risk                                              | Why it matters                                                                                                | Early signal                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| DataFast defends the $9 indie position            | It is the closest positioning match, with five providers, MCP, a founder audience and a claimed 28,285 users. | DataFast price drop, free tier, or a 20-site plan under $15       |
| trckable's free plan absorbs the low end          | Free, 1 site, unlimited pageviews, no card; price lock for early customers.                                   | trckable removing the free plan or raising the early price        |
| Umami/PostHog free tiers make "traffic" worthless | Buyers may refuse to pay for pageviews alone.                                                                 | Continued free-tier expansion; Cloudflare adding revenue features |
| Meter arbitrage on Pro                            | 20 sites at a flat $14.99 can be abused by high-traffic agencies.                                             | Support tickets from high-event accounts; margin review           |
| Replay cost                                       | Replay is our differentiator but the most expensive feature to store and serve.                               | Storage cost per workspace in `PRICING_ECONOMICS.md`              |
| Copying a live product                            | Talivia is a live commercial product; the fork must be visibly distinct and legally clean.                    | Brand/IP review before launch                                     |
| Stale competitor claims                           | Two competitor prices were read from animated counters and need re-verification.                              | Re-check before any public comparison page                        |

---

## 8. What to verify next (cheap, concrete)

1. **Run the first-run flow on DataFast and Talivia** with a test site and a test
   payment account (test mode). Time it: signup → first attributed revenue. This
   is the only way to support an onboarding claim.
2. **Re-read DataFast Growth ($19), Baremetrics ($75) and ChartMogul ($69)** on a
   normal browser and screenshot the numbers. The counters made the digits
   ambiguous in this pass.
3. **Ask 10 target founders** which they would pay for: 20 sites, replay, or a
   lower price. The market data cannot answer preference.
4. **Check whether our Starter tier can include replay** at $7.99 without
   breaking margin; if not, move replay to Pro and change the positioning claim.
5. **Confirm payment-provider coverage** in the fork (Stripe, Lemon Squeezy,
   Polar, Dodo, Yolfi) works end-to-end in test mode. The README lists them; this
   pass did not execute them.
6. **Watch trckable and DataFast pricing pages** monthly. Both are early-stage
   and can change the anchor quickly.

---

## 9. Legal and compliance flags (for review — no conclusions here)

- **ActivateIQ name collision.** `activateiq.com` timed out on 2026-11-14, but the
  name is also used by an existing commission-management vendor. Have counsel
  check trademark use before any public reference.
- **Competitor comparisons.** Any public "cheaper than X" or feature-comparison
  page must be dated, accurate and re-checked; several prices here move with a
  slider or animate on load. Misleading comparative advertising carries risk in
  the EU/UK/US.
- **"Cheapest" / "only" claims.** These are absolute claims. Keep the dated
  evidence file, or soften to "from $7.99".
- **Upstream brand and licence.** Talivia is MIT; the LICENSE and copyright
  notice must stay intact, and Talivia branding must be removed from
  customer-facing UI (already required by `AGENTS.md`). This is a licence/brand
  task, not a legal conclusion.
- **Payment provider marks.** Displaying Stripe/Dodo/Polar/Lemon Squeezy/Yolfi
  logos in an integration list may require permission under their brand
  guidelines. Verify before publishing.
- **Privacy claims.** "No cookies", "GDPR-friendly" and similar claims must match
  what the tracker actually does; the competitor pages make these claims, but
  that is not evidence for ours.

---

## 10. Bottom line for the build

The market supports the two-plan model at $7.99 / $14.99 **if**:

1. Starter includes payment attribution (otherwise it is a worse Pirsch at a
   higher price);
2. the plans publish a traffic allowance and a no-surprise over-limit rule;
3. Pro's 20 sites are real and supportable at that price;
4. replay is either included credibly or used as the Pro upgrade reason;
5. onboarding reaches first attributed revenue faster than DataFast's "2
   minutes" claim — measured, not asserted.

If those five hold, the product has a defensible position: **the cheapest
revenue-attribution analytics with room for more than one site, built for people
who ship alone.**
