-- Global safety net for analytics payload retention.
-- Plan-specific retention is enforced by the application job; this TTL only
-- removes data older than the longest plan window (365 days) if a job is
-- delayed or disabled for a tenant.
ALTER TABLE talivia.website_event MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE talivia.event_data MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE talivia.session_data MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE talivia.website_event_stats_hourly MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE talivia.website_revenue MODIFY TTL created_at + INTERVAL 365 DAY;
ALTER TABLE talivia.session_replay MODIFY TTL created_at + INTERVAL 365 DAY;
