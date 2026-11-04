-- Remove the self-hosted bootstrap account created by 0001_oss_baseline.
--
-- The account is only disabled when it still has the known bootstrap password
-- hash. An operator who already changed the password keeps their account; a
-- fresh or unattended install cannot be signed into with admin/admin.
UPDATE "user"
SET
    "deleted_at" = CURRENT_TIMESTAMP,
    "role" = 'user',
    "updated_at" = CURRENT_TIMESTAMP
WHERE
    "user_id" = '00000000-0000-4000-8000-000000000001'
    AND "username" = 'admin'
    AND "password" = '$2b$10$vwQ2l6wWn280bLN6G28g.eCRpi2Jz8xicKOMbpbmZN7Gq3jBGJFYi';
