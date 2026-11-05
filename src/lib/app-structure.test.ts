import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const APP_ROOT = join(process.cwd(), 'src/app');
const FEATURES_ROOT = join(process.cwd(), 'src/features');
const SRC = join(process.cwd(), 'src');

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

/** Shared layers must never depend upward on a product domain. */
const SHARED_ROOTS = ['components', 'lib', 'permissions', 'queries', 'store'];

/** Shared design-system / infrastructure directories under src/components. */
const SHARED_COMPONENT_DIRS = ['brand', 'charts', 'common', 'hooks', 'input', 'svg'];

/**
 * `src/lib` is the cross-cutting infrastructure layer. Domain helpers belong
 * in `src/features/<domain>/lib`. The allowlist covers only modules that are
 * genuinely shared between domains, the analytics engine, or tenant
 * authorization. Adding a new file here is a deliberate architectural change.
 */
const SHARED_LIB_MODULES = new Set([
  'app-config.ts',
  'app-route.ts',
  'auth-cookie.ts',
  'auth-session.ts',
  'auth-tokens.ts',
  'auth-user.ts',
  'auth.ts',
  'board-types.ts',
  'brand.ts',
  'charts.ts',
  'clickhouse.ts',
  'colors.ts',
  'constants.ts',
  'crypto.ts',
  'csrf.ts',
  'currency-exchange.ts',
  'dashboard-breakdown.ts',
  'data.ts',
  'date.ts',
  'db-retry.ts',
  'db.ts',
  'email.ts',
  'entitlements.ts',
  'entity.ts',
  'fetch.ts',
  'format.ts',
  'generate.ts',
  'get-base-url.ts',
  'ip.ts',
  'jwt.ts',
  'kafka.ts',
  'lang.ts',
  'load.ts',
  'params.ts',
  'password.ts',
  'payment-status.ts',
  'paymentCustomer.ts',
  'plans.ts',
  'platform-admin.ts',
  'prisma-error.ts',
  'prisma.ts',
  'rate-limit.ts',
  'react.ts',
  'redact.ts',
  'redis.ts',
  'reporting-currency.ts',
  'request.ts',
  'response.ts',
  'schema.ts',
  'share-redaction.ts',
  'share-sections.ts',
  'sql.ts',
  'storage.ts',
  'stripe-amount.ts',
  'tracking-identity.ts',
  'types.ts',
  'url.ts',
  'usage.ts',
  'utils.ts',
  'website-overview.ts',
  'workspace-auth.ts',
]);

/** Shared client state. Domain stores belong in `src/features/<domain>/store`. */
const SHARED_STORE_MODULES = new Set(['app.ts']);

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
      expect(
        existsSync(join(FEATURES_ROOT, module, 'server')),
        `missing server for ${module}`,
      ).toBe(true);
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

  test('src/components contains shared primitives only', () => {
    const directories = readdirSync(join(SRC, 'components'))
      .filter(entry => statSync(join(SRC, 'components', entry)).isDirectory())
      .sort();

    expect(directories).toEqual(SHARED_COMPONENT_DIRS);
  });

  test('src/lib contains shared infrastructure only', () => {
    const modules = readdirSync(join(SRC, 'lib')).filter(
      entry => !entry.includes('.test.') && statSync(join(SRC, 'lib', entry)).isFile(),
    );

    const domainModules = modules.filter(entry => !SHARED_LIB_MODULES.has(entry)).sort();

    expect(domainModules).toEqual([]);
  });

  test('src/store contains shared client state only', () => {
    const modules = readdirSync(join(SRC, 'store'));

    const domainStores = modules.filter(entry => !SHARED_STORE_MODULES.has(entry)).sort();

    expect(domainStores).toEqual([]);
  });

  test('domain helpers live in their feature module', () => {
    const expected = [
      'analytics/lib/attribution-query.ts',
      'analytics/lib/collector-cache.ts',
      'analytics/lib/dashboard-overview.ts',
      'auth/lib/auth-return-url.ts',
      'auth/server/registration.ts',
      'legacy/lib/legacy-features.ts',
      'payments/lib/payment-detection.ts',
      'system/lib/oss-version.ts',
      'websites/lib/api-key.ts',
      'websites/lib/website-domain.ts',
      'workspaces/lib/workspace-invitations.ts',
      'workspaces/lib/workspace-members.ts',
    ];

    for (const path of expected) {
      expect(existsSync(join(FEATURES_ROOT, path)), `missing src/features/${path}`).toBe(true);
    }
  });

  test('shared layers never import a product feature', () => {
    const violations = SHARED_ROOTS.flatMap(root =>
      walk(join(SRC, root))
        .filter(file => /\.(ts|tsx)$/.test(file))
        .filter(file => !file.includes('.test.'))
        .flatMap(file => {
          const content = readFileSync(file, 'utf8');
          return content.includes("from '@/features/")
            ? [`${relative(SRC, file)} -> ${content.match(/from '(@\/features\/[^']+)'/)?.[1]}`]
            : [];
        }),
    );

    expect(violations).toEqual([]);
  });
});
