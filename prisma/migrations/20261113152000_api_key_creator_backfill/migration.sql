-- Attribute pre-existing website-scoped API keys to the website creator so
-- key authentication can re-check live workspace membership. Keys without a
-- creator remain legacy and continue to require explicit revocation.
UPDATE "api_key" AS k
SET "user_id" = w."created_by"
FROM "website" AS w
WHERE k."website_id" = w."website_id"
  AND k."user_id" IS NULL
  AND w."created_by" IS NOT NULL;
