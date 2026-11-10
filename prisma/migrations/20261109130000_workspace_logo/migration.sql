-- Workspace photo shown during onboarding and in workspace lists.
-- Stored as a small, client-resized data URL so the app does not depend on
-- object storage for a single workspace image.
ALTER TABLE "workspace" ADD COLUMN "logo_url" TEXT;
