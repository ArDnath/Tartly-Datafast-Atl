-- Monthly usage metering (Phase 6).
--
-- Events are counted only after they are accepted by the collector, so bot,
-- blocked-IP, duplicate replay, and invalid requests never consume allowance.
-- PostgreSQL is the source of truth; the counters are incremented atomically
-- with a conditional UPDATE so concurrent ingestion cannot overcount.

CREATE TABLE "usage_period" (
    "usage_period_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "events_count" INTEGER NOT NULL DEFAULT 0,
    "replay_sessions_count" INTEGER NOT NULL DEFAULT 0,
    "warning_notified_at" TIMESTAMPTZ(6),
    "limit_notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "usage_period_pkey" PRIMARY KEY ("usage_period_id")
);

CREATE UNIQUE INDEX "usage_period_workspace_id_period_start_key"
    ON "usage_period"("workspace_id", "period_start");
CREATE INDEX "usage_period_workspace_id_period_end_idx"
    ON "usage_period"("workspace_id", "period_end");

CREATE TABLE "usage_replay_session" (
    "usage_replay_session_id" UUID NOT NULL,
    "usage_period_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "session_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_replay_session_pkey" PRIMARY KEY ("usage_replay_session_id")
);

CREATE UNIQUE INDEX "usage_replay_session_usage_period_id_session_id_key"
    ON "usage_replay_session"("usage_period_id", "session_id");
CREATE INDEX "usage_replay_session_usage_period_id_idx"
    ON "usage_replay_session"("usage_period_id");
