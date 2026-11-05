import { existsSync, readdirSync, statSync } from 'node:fs';
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
  'app-shell',
  'portfolio',
  'websites',
  'settings',
  'onboarding',
  'auth',
  'marketing',
  'share',
  'legacy',
];

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
});
