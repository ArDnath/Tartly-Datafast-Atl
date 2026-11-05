# Pricing Economics

- **Date:** 2026-11-04
- **Owner-fixed prices:** Starter **$7.99/mo**, Pro **$14.99/mo**.
- **No free tier. No third plan.**
- **Website limits fixed:** Starter **1**, Pro **up to 20**.
- Everything else (events, retention, replay, members) is proposed here and
  must be approved before billing goes live.

> All prices below were fetched from the vendors' own pages on 2026-11-04.
> Where a page would not render a value, it is marked **UNVERIFIED**. This is a
> model, not a quote.

---

## 1. Competitor pricing (fetched 2026-11-04)

| Vendor | Entry price | What the entry tier includes | Source |
| --- | --- | --- | --- |
| **DataFast** | **$9/mo** Starter | 10k monthly events, 1 website, 1 team member, 3-year retention; Growth **$19/mo** adds 30 websites/members, 5+ years, social mentions, link attribution. 14-day trial, 2 months free yearly. | <https://datafa.st/> (pricing markup; values rendered by the page's number component) |
| **Talivia Cloud** | **$9.99/mo** founding offer | 14-day trial, then $9.99/mo for the first 100 paying accounts, **unlimited websites and events for the first 12 months**. Standard event-based pricing applies after month 12; the standard rates are **not published on the page**. | <https://talivia.com/> (`#pricing`, JSON-LD offer) |
| **Plausible** | **$9/mo** Starter | 10k monthly pageviews, 1 site; Growth **$14** (3 sites, 3 members); Business **$19** (10 sites, 10 members, funnels, ecommerce revenue attribution). 30-day trial, 2 months free yearly. | <https://plausible.io/#pricing> |
| **Fathom** | **$15/mo** | Up to 100k monthly pageviews, 50 sites included; 7-day trial; 2 months free yearly. Price rises with pageviews ($25/200k, $45/500k, $60/1M, …). | <https://usefathom.com/pricing> |
| **Umami Cloud** | **$0** Hobby / **$20/mo** Pro | Hobby: 100k events, 1 website, 6-month retention. Pro: 1M events included, $0.00003/extra event, 20 websites, 10 members, 2-year retention, API/MCP. Business $200 (10M events, unlimited sites, replay/heatmaps). | <https://umami.is/pricing> |
| **Simple Analytics** | **$20/mo** | 100k monthly pageviews, 1 user; +$20/mo per extra user; free hobby plan (1 user, 5 sites, 1 month history, badge required); 2 months free yearly. | <https://www.simpleanalytics.com/pricing> |

**Takeaway:** the market entry point is $9–$20/mo for 10k–100k monthly units.
Our $7.99 Starter is the cheapest paid entry among these, and $14.99 Pro sits
between Plausible Growth and Fathom's 100k tier while including revenue
attribution and 20 websites.

**Talivia-specific caution:** Talivia Cloud's founding offer is temporarily
$9.99 with *unlimited* sites/events for 12 months. We cannot match "unlimited"
on a shared PostgreSQL event store. Compete on price, clarity, and developer
experience — not on an unsustainable unlimited promise. State clearly that our
limits are monthly and that overage pauses rather than surprises.

---

## 2. Our plan proposal

| | **Starter** | **Pro** |
| --- | --- | --- |
| Monthly | **$7.99** | **$14.99** |
| Annual (2 months free) | **$79.90** | **$149.90** |
| Websites | **1** | **up to 20** |
| Members | 1 | 5 |
| Billable events / month | **50,000** | **500,000** |
| Analytics retention | **90 days** | **180 days** |
| Session replay | **not included** | **2,000 sessions/mo**, 30-day replay retention |
| Payment connections | 1 | unlimited |
| Revenue attribution | first + last touch | first + last touch, funnels, journeys |
| Support | email | priority email |
| Export | CSV | CSV + full backup |

Why these limits:

- **50k events at $7.99** is 5× DataFast's 10k at $9 and 5× Plausible's 10k
  pageviews at $9. It is still cheap to store for 90 days.
- **500k events at $14.99** is 5× Fathom's 100k at $15 and half of Umami Pro's
  1M at $20. Pro's 180-day retention keeps storage bounded.
- **Replay only on Pro** because rrweb payloads are 10–100× an event row. It
  becomes the main upgrade reason and protects the Starter margin.
- **20 websites on Pro** matches the owner's requirement and Umami Pro's 20.
- Annual at two months free is offered only because the modelled margin stays
  above 85% at every volume tier (below).

These limits are a **proposal**, not yet enforced in code. Phase 6 implements
metering and the 80%/100% policy.

---

## 3. Cost assumptions

| Cost | Assumption | Source |
| --- | --- | --- |
| App hosting | Vercel Pro **$20/mo** including $20 usage credit; overage possible | <https://vercel.com/pricing> (2026-11-04) |
| Database compute | Neon Launch **$0.106/CU-hour**, 0.25 CU average ≈ **$19.35/mo** base; model uses $30/mo at 100 customers, scaling with load | <https://neon.com/pricing> (2026-11-04) |
| Database storage | Neon **$0.35/GB-month** | same |
| Event row size | **1 KB/event** including indexes (conservative) | engineering assumption |
| Replay payload | **0.5 MB/session** (rrweb gzip, mixed session lengths) | engineering assumption; measure in Phase 7 |
| Email | Resend Free **3,000 emails/mo** at launch; Pro **$20/mo** at 50k | <https://resend.com/pricing> (2026-11-04) |
| Payment fees | Dodo **4% + $0.40** per transaction (US cards); +3% for international cards/APMs; +3% BNPL | <https://dodopayments.com/pricing> (2026-11-04) |
| Plan mix | **70% Starter / 30% Pro** | assumption; validate after launch |
| Blended ARPU | 0.7 × 7.99 + 0.3 × 14.99 = **$10.09/mo** | derived |
| Domain | ~$1.50/mo amortized | assumption (registrar-dependent) |
| Support | Founder time at launch; no salary cost modelled | assumption |

Storage per customer:

- Starter: 50k events × 3 months × 1 KB ≈ **0.15 GB**.
- Pro: 500k events × 6 months × 1 KB ≈ **3.0 GB**, plus 2,000 replays ×
  0.5 MB × 1 month ≈ **1.0 GB** → **~4.0 GB**.
- Replay is kept 30 days; analytics 90/180 days. Old rows are deleted by the
  retention job (Phase 7). Without deletion the model fails.

---

## 4. Margin model

Fees = 4% of MRR + $0.40 per paying customer. Gross profit = net revenue −
infrastructure − payment fees (support/founder time excluded).

Storage at 100 customers: 70 × 0.15 + 30 × 4.0 = **130.5 GB** →
**$45.68/mo** at $0.35/GB.
At 500: 652.5 GB → **$228.38/mo**.
At 1,000: 1,305 GB → **$456.75/mo**.
At 5,000: 6,525 GB → **$2,283.75/mo**.

| Customers | MRR | Dodo fees | Net revenue | Neon compute | Neon storage | App + email + domain | Total cost | Gross profit | Margin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | $1,009 | $80.36 | $928.64 | $30 | $45.68 | $23 | $98.68 | $829.96 | **89.4%** |
| 500 | $5,045 | $401.80 | $4,643.20 | $80 | $228.38 | $43 | $351.38 | $4,291.82 | **92.4%** |
| 1,000 | $10,090 | $803.60 | $9,286.40 | $150 | $456.75 | $43 | $649.75 | $8,636.65 | **93.0%** |
| 5,000 | $50,450 | $4,018.00 | $46,432.00 | $600 | $2,283.75 | $85 | $2,968.75 | $43,463.25 | **93.6%** |

Notes:

- The 100-customer margin is lowest because fixed app/email/domain costs are
  spread over fewer accounts. It still clears 89%.
- At 5,000 customers, 6.5 TB on Neon is not the right long-term store. Move
  events to ClickHouse/object storage before that; ClickHouse Cloud lists
  **$0.2181/unit-hour** compute and **$25.30/TB-month** storage
  (<https://clickhouse.com/pricing>, 2026-11-04). At 6.5 TB, ClickHouse storage
  alone is ~$164/mo, materially cheaper than Neon at this volume.
- Payment fees dominate variable cost. International cards (+3%) reduce margin
  by about 3 points; model them as a separate line once live.
- Annual plans improve cash flow but do not change the monthly margin (Dodo
  charges per transaction; the effective fee on a single annual charge is
  lower per month).

**Conclusion:** the owner-fixed prices work **if** Starter has no replay and
Pro retention stays at 180 days. No price change is required. If replay is
added to Starter, its margin falls below the 85% target at 100 customers
because replay storage is the dominant variable.

---

## 5. Limit policy (public)

- **80% of allowance:** in-app banner + email. No throttling.
- **100%:** in-app banner + email; a **5% grace allowance** keeps ingestion
  running while the customer decides.
- **After grace:** billable ingestion pauses. The dashboard, reports, exports
  and billing remain accessible. Events are **not silently deleted**.
- **No automatic overage billing.** Overage is opt-in only, with a clear price
  before enabling.
- Reset at the start of each billing period (UTC). Usage is counted from
  accepted, validated, deduplicated, non-bot events; replays are counted
  separately.
- Downgrades take effect at the end of the paid period. Data above the new
  retention is deleted on the normal retention schedule, not immediately.

---

## 6. Open questions

- **UNVERIFIED:** DataFast's exact price at 100k/500k events (the page's
  animated counter did not render; the $9/$19 entry values are from the
  official markup). Re-check before publishing comparison pages.
- **UNVERIFIED:** Talivia Cloud's post-founding standard pricing. The page only
  states "standard event-based pricing" after 12 months.
- **UNVERIFIED:** Dodo's effective fee for our customer mix (country/card mix).
  Use actual settlement reports after the first month.
- **UNVERIFIED:** real replay bytes/session and events/customer. Phase 7 must
  measure and replace the 0.5 MB / 1 KB assumptions.
- **UNVERIFIED:** Resend free-tier adequacy once verification + usage emails are
  enabled; 3,000/mo may be tight at 1,000 customers.

---

## 7. Sources

All fetched **2026-11-04**:

1. DataFast — <https://datafa.st/> (pricing section, official markup).
2. Talivia Cloud — <https://talivia.com/> (`#pricing`, JSON-LD).
3. Plausible — <https://plausible.io/#pricing>.
4. Fathom — <https://usefathom.com/pricing>.
5. Umami — <https://umami.is/pricing>.
6. Simple Analytics — <https://www.simpleanalytics.com/pricing>.
7. Vercel — <https://vercel.com/pricing>.
8. Neon — <https://neon.com/pricing>.
9. ClickHouse Cloud — <https://clickhouse.com/pricing>.
10. Dodo Payments — <https://dodopayments.com/pricing>.
11. Resend — <https://resend.com/pricing>.
