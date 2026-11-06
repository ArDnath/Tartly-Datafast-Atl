import { describe, expect, test } from 'vitest';
import {
  WORKSPACE_ROLES,
  canWorkspace,
  hasMinimumRole,
  isWorkspaceRole,
  slugifyWorkspaceName,
} from './workspace-auth';

describe('workspace permission matrix', () => {
  test('OWNER can do everything', () => {
    for (const action of [
      'workspace:update',
      'workspace:delete',
      'workspace:transfer',
      'billing:manage',
      'members:manage',
      'website:delete',
    ] as const) {
      expect(canWorkspace('OWNER', action)).toBe(true);
    }
  });

  test('ADMIN manages websites, members, integrations but not billing, transfer or deletion', () => {
    expect(canWorkspace('ADMIN', 'website:create')).toBe(true);
    expect(canWorkspace('ADMIN', 'website:update')).toBe(true);
    expect(canWorkspace('ADMIN', 'members:manage')).toBe(true);
    expect(canWorkspace('ADMIN', 'integrations:manage')).toBe(true);
    expect(canWorkspace('ADMIN', 'billing:manage')).toBe(false);
    expect(canWorkspace('ADMIN', 'workspace:transfer')).toBe(false);
    expect(canWorkspace('ADMIN', 'workspace:delete')).toBe(false);
  });

  test('MEMBER reads and updates websites but cannot manage members or delete', () => {
    expect(canWorkspace('MEMBER', 'website:read')).toBe(true);
    expect(canWorkspace('MEMBER', 'website:update')).toBe(true);
    expect(canWorkspace('MEMBER', 'analytics:read')).toBe(true);
    expect(canWorkspace('MEMBER', 'website:create')).toBe(false);
    expect(canWorkspace('MEMBER', 'website:delete')).toBe(false);
    expect(canWorkspace('MEMBER', 'members:manage')).toBe(false);
    expect(canWorkspace('MEMBER', 'billing:manage')).toBe(false);
  });

  test('VIEWER is read-only', () => {
    expect(canWorkspace('VIEWER', 'website:read')).toBe(true);
    expect(canWorkspace('VIEWER', 'analytics:read')).toBe(true);
    for (const action of [
      'website:create',
      'website:update',
      'website:delete',
      'members:manage',
      'billing:manage',
      'exports:read',
    ] as const) {
      expect(canWorkspace('VIEWER', action)).toBe(false);
    }
  });

  test('role hierarchy is explicit', () => {
    expect(hasMinimumRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasMinimumRole('ADMIN', 'MEMBER')).toBe(true);
    expect(hasMinimumRole('MEMBER', 'ADMIN')).toBe(false);
    expect(hasMinimumRole('VIEWER', 'VIEWER')).toBe(true);
    expect(hasMinimumRole('VIEWER', 'MEMBER')).toBe(false);
  });

  test('rejects unknown roles instead of treating them as owners', () => {
    expect(WORKSPACE_ROLES).toEqual(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
    expect(isWorkspaceRole('owner')).toBe(false);
    expect(isWorkspaceRole('SUPERADMIN')).toBe(false);
    expect(isWorkspaceRole('MEMBER')).toBe(true);
  });

  test('slugifies workspace names safely', () => {
    expect(slugifyWorkspaceName('  Acme Studio  ')).toBe('acme-studio');
    expect(slugifyWorkspaceName('Tartly / EU')).toBe('tartly-eu');
    expect(slugifyWorkspaceName('***')).toBe('workspace');
  });
});
