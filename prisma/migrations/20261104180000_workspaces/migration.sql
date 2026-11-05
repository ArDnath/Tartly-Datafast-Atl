-- Workspace tenancy foundation.
--
-- relationMode is "prisma" in this schema, so foreign keys are enforced by the
-- Prisma client rather than PostgreSQL. We still add the unique/index
-- constraints that carry the tenant invariant.

CREATE TABLE "workspace" (
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "owner_id" UUID NOT NULL,
    "plan_id" VARCHAR(50),
    "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'incomplete',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("workspace_id")
);

CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace"("slug");
CREATE INDEX "workspace_owner_id_idx" ON "workspace"("owner_id");
CREATE INDEX "workspace_created_at_idx" ON "workspace"("created_at");

CREATE TABLE "workspace_membership" (
    "workspace_membership_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspace_membership_pkey" PRIMARY KEY ("workspace_membership_id")
);

CREATE UNIQUE INDEX "workspace_membership_workspace_id_user_id_key"
    ON "workspace_membership"("workspace_id", "user_id");
CREATE INDEX "workspace_membership_workspace_id_idx" ON "workspace_membership"("workspace_id");
CREATE INDEX "workspace_membership_user_id_idx" ON "workspace_membership"("user_id");

CREATE TABLE "workspace_invitation" (
    "workspace_invitation_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "invitation_token_hash" VARCHAR(255) NOT NULL,
    "invited_by" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitation_pkey" PRIMARY KEY ("workspace_invitation_id")
);

CREATE UNIQUE INDEX "workspace_invitation_workspace_id_email_key"
    ON "workspace_invitation"("workspace_id", "email");
CREATE INDEX "workspace_invitation_workspace_id_idx" ON "workspace_invitation"("workspace_id");
CREATE INDEX "workspace_invitation_invitation_token_hash_idx"
    ON "workspace_invitation"("invitation_token_hash");
CREATE INDEX "workspace_invitation_expires_at_idx" ON "workspace_invitation"("expires_at");

ALTER TABLE "website" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "website_workspace_id_idx" ON "website"("workspace_id");

-- Backfill: one personal workspace per existing user, with an OWNER
-- membership. The slug is deterministic and unique (username + user-id prefix).
INSERT INTO "workspace" (
    "workspace_id",
    "name",
    "slug",
    "owner_id",
    "plan_id",
    "subscription_status",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    COALESCE(NULLIF(BTRIM("username"), ''), 'Personal') || ' workspace',
    LOWER(
        COALESCE(
            NULLIF(
                TRIM(BOTH '-' FROM REGEXP_REPLACE("username", '[^a-zA-Z0-9]+', '-', 'g')),
                ''
            ),
            'workspace'
        )
    ) || '-' || LEFT("user_id"::text, 8),
    "user_id",
    NULL,
    'incomplete',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user"
WHERE "deleted_at" IS NULL;

INSERT INTO "workspace_membership" (
    "workspace_membership_id",
    "workspace_id",
    "user_id",
    "role",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    w."workspace_id",
    w."owner_id",
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "workspace" w
ON CONFLICT ("workspace_id", "user_id") DO NOTHING;

-- Attach user-owned websites to that user's personal workspace.
UPDATE "website" w
SET "workspace_id" = ws."workspace_id"
FROM "workspace" ws
WHERE w."user_id" = ws."owner_id"
  AND w."workspace_id" IS NULL;

-- Attach team-owned websites to the team owner's personal workspace. This is
-- a compatibility bridge; Phase 2 replaces team ownership with workspace
-- ownership explicitly.
UPDATE "website" w
SET "workspace_id" = ws."workspace_id"
FROM "team_user" tu
JOIN "workspace" ws ON ws."owner_id" = tu."user_id"
WHERE w."team_id" = tu."team_id"
  AND tu."role" = 'team-owner'
  AND w."workspace_id" IS NULL;
