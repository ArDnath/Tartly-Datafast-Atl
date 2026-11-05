import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = join(process.cwd(), 'src/app/api');

const TENANT_ROOTS = ['websites', 'reports', 'users', 'workspaces'];

const AUTHORIZATION_HELPERS = [
  'canViewWebsite',
  'canUpdateWebsite',
  'canDeleteWebsite',
  'canManageWebsiteMembers',
  'canViewEntity',
  'canUpdateEntity',
  'canDeleteEntity',
  'requireWorkspaceAccess',
  'requireWebsiteAccess',
  'getWebsiteWorkspaceAccess',
  'getWebsiteAccess',
  'canViewReport',
  'canUpdateReport',
  'canDeleteReport',
  'canViewUser',
  'canUpdateUser',
  'canDeleteUser',
  'canViewUsers',
  'canCreateUser',
  'listWorkspaceMembers',
  'updateWorkspaceMemberRole',
  'removeWorkspaceMember',
  'createWorkspaceInvitation',
  'listWorkspaceInvitations',
  'revokeWorkspaceInvitation',
];

function findRoutes(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return findRoutes(path);
    }

    return entry === 'route.ts' ? [path] : [];
  });
}

function relativePath(path: string) {
  return relative(ROOT, path);
}

/**
 * Route files are thin re-exports; the authorization helper now lives in the
 * feature server module the route points at. Follow the re-export so the
 * static boundary check keeps covering the real handler logic.
 */
function handlerSource(routePath: string): string {
  const route = readFileSync(routePath, 'utf8');
  const match = route.match(/from '@\/(features\/[^']+)';/);

  if (!match) {
    return route;
  }

  const handlerPath = join(process.cwd(), 'src', `${match[1]}.ts`);

  return readFileSync(handlerPath, 'utf8');
}

// Routes that are scoped by the authenticated user's own ID (never by an
// arbitrary tenant ID) and therefore do not need a website helper.
const SELF_SCOPED = new Set(['workspaces/route.ts']);

describe('tenant-scoped API routes', () => {
  test('every route under a tenant resource calls a workspace/website authorization helper', () => {
    const unscoped = TENANT_ROOTS.flatMap(root => findRoutes(join(ROOT, root)))
      .filter(path => !SELF_SCOPED.has(relativePath(path)))
      // Invitation routes delegate to workspace-invitations, which performs
      // the ADMIN check inside each function.
      .filter(path => !relativePath(path).includes('invitations'))
      .filter(path => {
        const source = handlerSource(path);

        return !AUTHORIZATION_HELPERS.some(helper => source.includes(helper));
      });

    expect(unscoped).toEqual([]);
  });
});
