-- Share links are read-only public URLs. They must not live forever: add an
-- explicit expiry and backfill existing links to the default 30-day window so
-- old links created before this migration also stop working.
ALTER TABLE "share" ADD COLUMN "expires_at" TIMESTAMPTZ(6);

UPDATE "share"
SET "expires_at" = now() + interval '30 days'
WHERE "expires_at" IS NULL;

CREATE INDEX "share_expires_at_idx" ON "share"("expires_at");
