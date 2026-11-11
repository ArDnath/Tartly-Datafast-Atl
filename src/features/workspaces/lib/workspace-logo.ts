/**
 * Workspace photos are uploaded during onboarding without an object store.
 * The browser downsizes the image to a small square data URL before sending
 * it, so the database only holds a bounded string.
 *
 * Accepting a data URL (rather than an arbitrary URL) keeps the value safe to
 * render directly in an <img> and prevents the workspace API from becoming an
 * open URL proxy.
 */
export const WORKSPACE_LOGO_MAX_LENGTH = 512_000;
export const WORKSPACE_LOGO_MAX_REMOTE_LENGTH = 2_048;

const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;

export function isWorkspaceLogoUrl(value: string) {
  if (!value) {
    return false;
  }

  if (DATA_IMAGE_PATTERN.test(value)) {
    return value.length <= WORKSPACE_LOGO_MAX_LENGTH;
  }

  if (value.startsWith('https://')) {
    return value.length <= WORKSPACE_LOGO_MAX_REMOTE_LENGTH;
  }

  return false;
}
