-- One-time install-verification allowance. This is not a free plan: it is
-- consumed once per workspace and never resets.
ALTER TABLE "workspace"
  ADD COLUMN "setup_events_count" INTEGER NOT NULL DEFAULT 0;
