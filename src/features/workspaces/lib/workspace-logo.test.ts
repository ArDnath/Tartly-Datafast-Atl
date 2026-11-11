import { describe, expect, test } from 'vitest';
import {
  isWorkspaceLogoUrl,
  WORKSPACE_LOGO_MAX_LENGTH,
  WORKSPACE_LOGO_MAX_REMOTE_LENGTH,
} from './workspace-logo';

const PNG_DATA_URL = `data:image/png;base64,${'a'.repeat(64)}`;

describe('isWorkspaceLogoUrl', () => {
  test('accepts bounded image data URLs', () => {
    expect(isWorkspaceLogoUrl(PNG_DATA_URL)).toBe(true);
    expect(isWorkspaceLogoUrl('data:image/webp;base64,AAAA')).toBe(true);
    expect(isWorkspaceLogoUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isWorkspaceLogoUrl('data:image/gif;base64,AAAA')).toBe(true);
  });

  test('rejects non-image, script, and oversized values', () => {
    expect(isWorkspaceLogoUrl('data:text/html;base64,AAAA')).toBe(false);
    expect(isWorkspaceLogoUrl('javascript:alert(1)')).toBe(false);
    expect(
      isWorkspaceLogoUrl(`data:image/png;base64,${'a'.repeat(WORKSPACE_LOGO_MAX_LENGTH)}`),
    ).toBe(false);
    expect(isWorkspaceLogoUrl('')).toBe(false);
  });

  test('allows short https image URLs for future hosted logos', () => {
    expect(isWorkspaceLogoUrl('https://cdn.example.com/logo.png')).toBe(true);
    expect(
      isWorkspaceLogoUrl(`https://cdn.example.com/${'a'.repeat(WORKSPACE_LOGO_MAX_REMOTE_LENGTH)}`),
    ).toBe(false);
  });
});
