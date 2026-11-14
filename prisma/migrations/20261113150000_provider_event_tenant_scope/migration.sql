-- Provider event IDs are unique per provider account in theory, but the same
-- provider event can reach two websites (for example an agency connecting the
-- same Stripe account twice). Scope idempotency to the tenant so one site can
-- never suppress or steal another site's event.
DROP INDEX IF EXISTS "provider_event_provider_name_provider_event_key_key";

CREATE UNIQUE INDEX "provider_event_website_id_provider_name_provider_event_ke_key"
  ON "provider_event"("website_id", "provider_name", "provider_event_key");
