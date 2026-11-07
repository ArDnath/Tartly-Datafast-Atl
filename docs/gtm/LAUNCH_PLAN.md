# Launch plan

## Pre-launch (T-10 to T-1)

- Deploy to production, verify `/api/health/ready`, run the launch checklist.
- Install the tracker on the Tartly marketing site and connect a real
  payment provider in test mode; capture a screenshot only if it is real.
- Publish `/pricing`, `/docs/install`, `/legal`, and the first three guides.
- Set up support inbox, status page, and error tracking.
- Prepare the Product Hunt gallery from actual screens, not mockups.
- Re-fetch every competitor price and update `docs/gtm/COMPETITORS.md`.
- Run the full `pnpm gate` and a 30-minute load test; record numbers.

## Launch day

1. Publish the launch post and pricing.
2. Product Hunt launch (12:01 AM PT).
3. Show HN at 8–9 AM ET (weekday).
4. Indie Hackers post with the revenue-attribution story and real numbers from
   our own analytics once available.
5. X thread: problem → screenshots → two plans → link.
6. LinkedIn post for the agency/team angle.
7. Dev.to post: "Revenue attribution without GA4" with the technical install.
8. Reply to every comment for the first 6 hours. Do not argue about price.

## Drafts

### Product Hunt

**Tagline:** Know which traffic makes money — start free for 7 days.

**Description:** Tartly connects your website and your payment provider so
you can see revenue by channel, campaign, landing page, and visitor journey.
First-touch and last-touch attribution, session replay on Pro, and two honest
plans. Try it for 7 days with 2,000 events, no card. Built for indie SaaS
founders.

### Show HN

**Title:** Show HN: Tartly – revenue attribution for indie SaaS ($7.99/mo)

**Body:** I built a small analytics tool that joins pageviews to payments so you
can see which channels actually produce revenue. It supports Stripe, Dodo,
Lemon Squeezy, Polar, Yolfi, and a manual API. Two plans and a 7-day free
trial. The interesting parts are the tenant isolation, idempotent webhooks, and
the first/last-touch attribution model. Happy to answer questions about the
architecture or the pricing math.

### Indie Hackers

**Title:** I priced revenue analytics at $7.99 because the existing tools are
priced for teams I don't have.

**Body:** The problem, the two plans, the 7-day trial, the margin model, and what I
deliberately left out (SSO, SLA, unlimited events). Ask for feedback on the
onboarding, not upvotes.

### Reddit rules check

Each subreddit has its own self-promotion rules. Read them before posting.
Prefer answering questions in r/SaaS, r/indiehackers, r/webdev, and
r/analytics with a link only when relevant. Do not cross-post the same text.

### X thread

1. You can see traffic. You can see Stripe. You still can't see which channel
   paid you.
2. Tartly joins the two: visitor → session → payment.
3. First-touch and last-touch, so you can see both the discovery channel and the
   closer.
4. Two plans: $7.99 Starter, $14.99 Pro. 7-day free trial, no per-seat tax.
5. Install one script, connect one provider, read the first report.
6. Link.

## 30-day calendar

| Day | Action |
| --- | --- |
| 1 | Launch: PH, HN, IH, X, LinkedIn, Dev.to |
| 2 | Publish "first touch vs last touch" |
| 3 | Answer launch comments; ship one onboarding fix from feedback |
| 4 | Publish Stripe guide |
| 5 | Email early users asking for the first missing report |
| 6 | Publish Dodo guide |
| 7 | Weekly metrics review; kill one low-signal channel |
| 8–14 | Two comparison pages, one migration guide, one teardown |
| 15 | First usage-limit and payment-failure email dry run |
| 16–21 | Publish three worked examples; improve onboarding copy |
| 22 | Ask five users for a 10-minute call |
| 23–29 | Ship the top three activation blockers |
| 30 | Public retrospective with real numbers or "not enough data yet" |

## Early-adopter offer

Do **not** invent a discount before the margin model allows it. If an offer is
needed, use a time-boxed annual price (two months free) only when
`docs/PRICING_ECONOMICS.md` shows the margin stays above the target. Never offer
a lifetime deal that cannot fund hosting and support.

## Success metrics

- Activation: signup → website → first event → payment connected → first
  attributed payment.
- Conversion: free-trial start → paid (measure checkout
  starts and completions).
- Revenue: MRR, ARPU, churn, expansion.
- Product: p95 dashboard latency, ingestion error rate, replay usage.
- Support: first response time, top three questions.

## Kill criteria

If after 30 days there are fewer than 10 paying customers and activation is
below 20%, stop paid acquisition, interview 10 founders, and fix onboarding
before spending more. Do not fabricate traction to keep the launch going.
