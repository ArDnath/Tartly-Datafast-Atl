-- Global safety net for analytics payload retention.
-- Plan-specific retention is enforced by the application job; this TTL only
-- removes data older than the longest plan window (365 days) if a job is
-- delayed or disabled for a tenant.
ALTER TABLE website_event MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE event_data MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE session_data MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE website_event_stats_hourly MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE website_revenue MODIFY TTL created_at + INTERVAL 365 DAY;
-- session_replay.created_at is DateTime64(6); TTL requires a DateTime result.
ALTER TABLE session_replay MODIFY TTL toDateTime(created_at) + INTERVAL 365 DAY;
