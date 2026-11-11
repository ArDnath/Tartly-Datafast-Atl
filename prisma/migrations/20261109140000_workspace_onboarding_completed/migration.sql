-- Track whether the customer finished the three-step setup flow. Existing
-- workspaces are treated as complete so the new flow never re-onboards a
-- customer who already had a workspace before this release.
ALTER TABLE "workspace"
ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(6);

UPDATE "workspace"
SET "onboarding_completed_at" = COALESCE("created_at", NOW())
WHERE "onboarding_completed_at" IS NULL;
