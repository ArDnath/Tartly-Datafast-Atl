-- Record which traffic tier a platform subscription bought.
--
-- The public pricing slider sells different event allowances. The provider
-- product determines the tier, so entitlements and usage metering must read the
-- purchased tier instead of assuming the plan default. Existing subscriptions
-- stay NULL and retain the plan's default allowance.

ALTER TABLE "platform_subscription"
    ADD COLUMN "traffic_tier_index" INTEGER;
