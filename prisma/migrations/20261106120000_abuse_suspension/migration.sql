-- Abuse controls: platform admins can suspend an account or a workspace
-- without deleting data. Existing rows are unaffected.
ALTER TABLE "workspace"
  ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
  ADD COLUMN "suspension_reason" VARCHAR(500);

ALTER TABLE "user"
  ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
  ADD COLUMN "suspension_reason" VARCHAR(500);

CREATE INDEX "workspace_suspended_at_idx" ON "workspace" ("suspended_at");
CREATE INDEX "user_suspended_at_idx" ON "user" ("suspended_at");
