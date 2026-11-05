import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const APP_ROOT = join(process.cwd(), 'src/app');
const FEATURES_ROOT = join(process.cwd(), 'src/features');

/**
 * Route conventions are the only files that belong under src/app. Product UI
 * lives in src/features so a screen can be inspected, tested, and moved
 * without touching the router. Providers is the single root exception because
 * it is mounted by the root layout rather than rendered by a route.
 */
const ROUTE_FILE = /^(page|layout|template|loading|error|global-error|not-found|route)\.(ts|tsx)$/;

const ROUTE_LOCAL_COMPONENTS = new Set(['Providers.tsx']);

const DOMAIN_MODULES = [
  'account',
  'analytics',
  'app-shell',
  'auth',
  'docs',
  'legacy',
  'marketing',
  'onboarding',
  'payments',
  'portfolio',
  'settings',
  'share',
  'system',
  'websites',
  'workspaces',
];

/**
 * Server domains own the request handlers behind the thin API routes. The
 * route file may only re-export HTTP methods and declare static Next config.
 */
const SERVER_MODULES = [
  'account',
  'analytics',
  'auth',
  'legacy',
  'payments',
  'share',
  'system',
  'websites',
  'workspaces',
  'settings/profile',
];

const RE_EXPORT_ONLY = /^export \{ [A-Z, ]+ \} from '@\/features\/[^']+';?$/;
const NEXT_CONFIG =
  /^export const (dynamic|runtime|revalidate|fetchCache|preferredRegion) = ['"][^'"]+['"];?$/;

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return walk(path);
    }

    return [path];
  });
}

describe('application source layout', () => {
  test('src/app contains routes only, plus the documented route-local screens', () => {
    const unexpected = walk(APP_ROOT)
      .map(path => relative(APP_ROOT, path))
      .filter(path => !path.endsWith('.css'))
      .filter(path => !path.includes('.test.'))
      .filter(path => !ROUTE_FILE.test(basename(path)))
      .filter(path => !ROUTE_LOCAL_COMPONENTS.has(path));

    expect(unexpected).toEqual([]);
  });

  test('every product domain has a feature module and no legacy route group exists', () => {
    for (const module of DOMAIN_MODULES) {
      expect(existsSync(join(FEATURES_ROOT, module)), `missing src/features/${module}`).toBe(true);
    }

    for (const legacy of ['websites', 'settings', 'links', 'boards', 'pixels']) {
      expect(
        existsSync(join(APP_ROOT, '(main)', legacy)),
        `legacy route group src/app/(main)/${legacy} should not exist`,
      ).toBe(false);
    }
  });

  test('API route files are thin re-exports from feature server modules', () => {
    for (const module of SERVER_MODULES) {
      expect(existsSync(join(FEATURES_ROOT, module, 'server')), `missing server for ${module}`).toBe(
        true,
      );
    }

    const apiFiles = walk(join(APP_ROOT, 'api')).filter(
      file => basename(file) === 'route.ts' && !file.includes('.test.'),
    );

    expect(apiFiles.length).toBeGreaterThan(0);

    for (const file of apiFiles) {
      const content = readFileSync(file, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

      expect(
        content.every(line => RE_EXPORT_ONLY.test(line) || NEXT_CONFIG.test(line)),
        `API route is not a thin re-export: ${relative(APP_ROOT, file)}`,
      ).toBe(true);
    }
  });
});
