-- The operational retention job scans by received_at / created_at across all
-- tenants. Composite tenant indexes cannot serve those global cutoffs.
CREATE INDEX "billing_event_received_at_idx" ON "billing_event"("received_at");
CREATE INDEX "provider_event_received_at_idx" ON "provider_event"("received_at");
CREATE INDEX "audit_event_created_at_idx" ON "audit_event"("created_at");
