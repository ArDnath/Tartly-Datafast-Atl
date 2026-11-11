-- Google is the only interactive sign-in. Google-created accounts do not have
-- a password, so the inherited NOT NULL constraint must be relaxed. Existing
-- password users keep their hash and can still be linked to a Google subject.
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "user" ADD COLUMN "google_id" VARCHAR(255);

-- Google's stable subject identifier. PostgreSQL unique indexes allow many
-- NULL values, so password-only and admin-created accounts remain valid.
CREATE UNIQUE INDEX "user_google_id_key" ON "user"("google_id");
