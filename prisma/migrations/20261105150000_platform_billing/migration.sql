-- Platform billing (Phase 5).
--
-- Context A only: these tables charge workspace owners for RevenueLens.
-- They are intentionally separate from the analytics integration tables
-- (`payment_provider_connection`, `payment`, `subscription`), which hold the
-- customer's own revenue data (context B). Never join the two by provider name.
--
-- Entitlements are derived from `platform_subscription`, which is written only
-- by a verified provider webhook or a provider API confirmation.

CREATE TABLE "billing_customer" (
    "billing_customer_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "provider_customer_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_customer_pkey" PRIMARY KEY ("billing_customer_id")
);

CREATE UNIQUE INDEX "billing_customer_workspace_id_key"
    ON "billing_customer"("workspace_id");
CREATE UNIQUE INDEX "billing_customer_provider_name_provider_customer_id_key"
    ON "billing_customer"("provider_name", "provider_customer_id");

CREATE TABLE "platform_subscription" (
    "platform_subscription_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "provider_subscription_id" VARCHAR(255) NOT NULL,
    "provider_customer_id" VARCHAR(255) NOT NULL,
    "plan_id" VARCHAR(50) NOT NULL,
    "product_id" VARCHAR(255),
    "interval" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "lifecycle_status" VARCHAR(50) NOT NULL,
    "provider_status" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMPTZ(6),
    "current_period_end" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "trial_end" TIMESTAMPTZ(6),
    "last_event_type" VARCHAR(100),
    "last_event_at" TIMESTAMPTZ(6) NOT NULL,
    "last_event_priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_subscription_pkey" PRIMARY KEY ("platform_subscription_id")
);

CREATE UNIQUE INDEX "platform_subscription_workspace_id_key"
    ON "platform_subscription"("workspace_id");
CREATE UNIQUE INDEX "platform_subscription_provider_name_provider_subscription_id_key"
    ON "platform_subscription"("provider_name", "provider_subscription_id");
CREATE INDEX "platform_subscription_workspace_id_lifecycle_status_idx"
    ON "platform_subscription"("workspace_id", "lifecycle_status");
CREATE INDEX "platform_subscription_provider_name_provider_customer_id_idx"
    ON "platform_subscription"("provider_name", "provider_customer_id");
CREATE INDEX "platform_subscription_current_period_end_idx"
    ON "platform_subscription"("current_period_end");

CREATE TABLE "billing_event" (
    "billing_event_id" UUID NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "provider_event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "workspace_id" UUID,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "payload" JSONB NOT NULL,
    "processing_status" VARCHAR(50) NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_event_pkey" PRIMARY KEY ("billing_event_id")
);

CREATE UNIQUE INDEX "billing_event_provider_event_id_key"
    ON "billing_event"("provider_event_id");
CREATE INDEX "billing_event_provider_name_event_type_idx"
    ON "billing_event"("provider_name", "event_type");
CREATE INDEX "billing_event_workspace_id_received_at_idx"
    ON "billing_event"("workspace_id", "received_at");

CREATE TABLE "billing_invoice" (
    "billing_invoice_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider_name" VARCHAR(50) NOT NULL,
    "provider_invoice_id" VARCHAR(255) NOT NULL,
    "provider_payment_id" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMPTZ(6),
    "period_end" TIMESTAMPTZ(6),
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "hosted_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("billing_invoice_id")
);

CREATE UNIQUE INDEX "billing_invoice_provider_name_provider_invoice_id_key"
    ON "billing_invoice"("provider_name", "provider_invoice_id");
CREATE INDEX "billing_invoice_workspace_id_issued_at_idx"
    ON "billing_invoice"("workspace_id", "issued_at");

CREATE TABLE "billing_subscription_change" (
    "billing_subscription_change_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "from_plan_id" VARCHAR(50),
    "to_plan_id" VARCHAR(50) NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "requested_by" UUID,
    "effective_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_subscription_change_pkey" PRIMARY KEY ("billing_subscription_change_id")
);

CREATE INDEX "billing_subscription_change_workspace_id_created_at_idx"
    ON "billing_subscription_change"("workspace_id", "created_at");
