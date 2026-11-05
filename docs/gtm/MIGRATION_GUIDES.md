# Migration guides

## From Plausible

1. Add your site in RevenueLens and install the new snippet.
2. Run both trackers for one week. RevenueLens accepts a `data-domain`-style
   hostname, but use its own `data-website-id`.
3. Import historical pageviews with the Plausible importer in website settings
   (CSV export from Plausible).
4. Connect your payment provider for revenue attribution; Plausible traffic
   history does not contain payment identity.
5. Remove the old snippet after the new one has seven consecutive days of
   events.

Caveat: imported rows may not have visitor identity, so historical revenue
attribution starts at the cutover. The UI labels imported data; it does not
invent matches.

## From Fathom

1. Create the website and install the snippet.
2. Import the Fathom CSV export through the website import flow.
3. Keep both scripts during the overlap; use separate website records if you
   need a clean comparison.
4. Connect Stripe/Dodo/Lemon Squeezy/Polar/Yolfi/manual API. Fathom's revenue
   events do not carry the same customer identity, so a backfill is not
   guaranteed.
5. Remove the old script after verification.

## From Umami

1. Export events from Umami Cloud/self-hosted.
2. Use the Umami importer; it accepts the standard CSV/JSON export shape.
3. Install the RevenueLens tracker.
4. Recreate goals, funnels, and segments. Umami's saved reports do not transfer
   automatically.
5. Connect payments and verify the first attributed event.

## From Simple Analytics

1. Install the tracker and run it in parallel.
2. Import the CSV export for historical traffic.
3. Recreate goals and shared links.
4. Connect payments; Simple Analytics' privacy model may not expose the visitor
   identity needed for historical joins.
5. Remove the old script.

## From DataFast

DataFast is the closest revenue-first competitor. Do not promise an automatic
import. Current plan:

1. Install RevenueLens in parallel.
2. Import pageview CSVs if exported.
3. Reconnect the same payment provider; historical payment rows are imported by
   the provider connection when supported.
4. Compare a full week of revenue before switching.
5. Keep DataFast until the first RevenueLens-attributed payment is verified.

## From Talivia (self-hosted or Cloud)

1. The RevenueLens importer accepts the Talivia export format
   (`/api/websites/[websiteId]/imports/talivia`).
2. Website IDs and tracking IDs are preserved by the import path where possible.
3. Payment connections must be re-authorized because provider credentials are
   encrypted per installation.
4. Keep the old installation until the import and one webhook delivery are
   verified.

## Universal rules

- Never delete the old tracker before seven days of clean events.
- Never claim historical attribution that the imported rows cannot support.
- Screenshot the before/after totals; if they differ, explain why instead of
  adjusting numbers.
- Support can help with exports, but never ask a customer for a plaintext
  provider secret in chat or email.
