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
  'billing',
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
  'redact.ts',
  'redis.ts',
  'reporting-currency.ts',
  'request.ts',
  'response.ts',
  'schema.ts',
  'share-redaction.ts',
  'share-sections.ts',
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

/**
 * `src/queries` is the shared data kernel. Domain repositories live in
 * `src/features/<domain>/server/queries`, and the analytics SQL engine lives in
 * `src/features/analytics/server/queries/sql`. Only repositories needed by the
 * shared authorization, request, auth, or billing kernel stay here.
 */
const SHARED_QUERY_MODULES = new Set([
  'audit.ts',
  'board.ts',
  'index.ts',
  'link.ts',
  'pixel.ts',
  'providerWebhookCleanup.ts',
  'segment.ts',
  'share.ts',
  'teamUser.ts',
  'user.ts',
  'website.ts',
  'websiteCurrency.ts',
  'websiteMember.ts',
]);

/**
 * `src/permissions` is the central tenant authorization boundary. Domain-only
 * permission checks (reports, local users, frozen legacy entities) live with
 * their feature; only website/entity authorization stays shared.
 */
const SHARED_PERMISSIONS_MODULES = new Set(['entity.ts', 'index.ts', 'website.ts']);

const DOMAIN_QUERY_MODULES: Record<string, string[]> = {
  account: ['portfolioMrr.ts', 'websiteOverview.ts'],
  analytics: [
    'dashboardBreakdown.ts',
    'historicalMetrics.ts',
    'report.ts',
    'revenueAttribution.ts',
    'revenueDiagnostics.ts',
    'revenueJourney.ts',
    'revenueSetup.ts',
    'sessionReplay.ts',
  ],
  payments: ['attribution.ts', 'payment.ts'],
  websites: ['websiteImport.ts'],
};

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

  test('src/queries contains the shared data kernel only', () => {
    expect(existsSync(join(SRC, 'queries/sql'))).toBe(false);

    const modules = readdirSync(join(SRC, 'queries/prisma')).filter(
      entry => !entry.includes('.test.') && statSync(join(SRC, 'queries/prisma', entry)).isFile(),
    );

    expect(modules.filter(entry => !SHARED_QUERY_MODULES.has(entry)).sort()).toEqual([]);

    for (const module of [
      'attribution.ts',
      'dashboardBreakdown.ts',
      'historicalMetrics.ts',
      'payment.ts',
      'portfolioMrr.ts',
      'report.ts',
      'revenueAttribution.ts',
      'revenueDiagnostics.ts',
      'revenueJourney.ts',
      'revenueSetup.ts',
      'sessionReplay.ts',
      'websiteImport.ts',
      'websiteOverview.ts',
    ]) {
      expect(
        existsSync(join(SRC, 'queries/prisma', module)),
        `${module} should live in its feature's server/queries directory`,
      ).toBe(false);
    }
  });

  test('domain repositories live in their feature server layer', () => {
    for (const [domain, modules] of Object.entries(DOMAIN_QUERY_MODULES)) {
      for (const module of modules) {
        expect(
          existsSync(join(FEATURES_ROOT, domain, 'server/queries', module)),
          `missing src/features/${domain}/server/queries/${module}`,
        ).toBe(true);
      }
    }

    expect(
      existsSync(join(FEATURES_ROOT, 'analytics/server/queries/sql/index.ts')),
      'the analytics SQL engine should live under features/analytics/server/queries/sql',
    ).toBe(true);
    expect(
      existsSync(join(FEATURES_ROOT, 'analytics/server/queries/session-cache.ts')),
      'the tenant-scoped session cache should live with analytics queries',
    ).toBe(true);
  });

  test('the route layer never reads data directly', () => {
    const violations = walk(APP_ROOT)
      .filter(file => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'))
      .flatMap(file => {
        const content = readFileSync(file, 'utf8');
        return /from '@\/queries\/|from '@\/lib\/prisma'|from '@\/lib\/redis'/.test(content)
          ? [relative(APP_ROOT, file)]
          : [];
      });

    expect(violations).toEqual([]);
  });

  test('src/permissions contains central tenant authorization only', () => {
    const modules = readdirSync(join(SRC, 'permissions')).filter(
      entry => !entry.includes('.test.') && statSync(join(SRC, 'permissions', entry)).isFile(),
    );

    const domainModules = modules.filter(entry => !SHARED_PERMISSIONS_MODULES.has(entry)).sort();

    expect(domainModules).toEqual([]);
    expect(existsSync(join(SRC, 'permissions/board.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'permissions/link.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'permissions/pixel.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'permissions/report.ts'))).toBe(false);
    expect(existsSync(join(SRC, 'permissions/user.ts'))).toBe(false);
  });

  test('domain helpers live in their feature module', () => {
    const expected = [
      'account/hooks/useUsersQuery.ts',
      'account/lib/permissions.ts',
      'account/lib/website-overview.ts',
      'account/server/queries/portfolioMrr.ts',
      'account/server/queries/websiteOverview.ts',
      'account/server/users/handler.ts',
      'account/settings/ProfilePage.tsx',
      'account/settings/SecuritySettingsPage.tsx',
      'account/settings/preferences/PreferencesPage.tsx',
      'analytics/lib/attribution-query.ts',
      'analytics/lib/collector-cache.ts',
      'analytics/lib/dashboard-breakdown.ts',
      'analytics/lib/dashboard-overview.ts',
      'analytics/lib/report-permissions.ts',
      'analytics/server/queries/session-cache.ts',
      'analytics/server/queries/sql/index.ts',
      'analytics/workbench/WebsiteLayout.tsx',
      'analytics/workbench/WebsiteLayoutRoute.tsx',
      'analytics/workbench/WebsiteHeader.tsx',
      'analytics/workbench/WebsitePage.tsx',
      'analytics/workbench/WebsiteSectionNav.tsx',
      'analytics/workbench/reports/revenue/RevenuePage.tsx',
      'analytics/workbench/sessions/SessionsPage.tsx',
      'auth/lib/auth-return-url.ts',
      'auth/server/registration.ts',
      'billing/UsageSettingsPage.tsx',
      'legacy/lib/legacy-features.ts',
      'legacy/lib/permissions.ts',
      'legacy/server/collect/link/handler.ts',
      'legacy/server/collect/pixel/handler.ts',
      'payments/lib/payment-detection.ts',
      'payments/lib/stripe-amount.ts',
      'payments/server/queries/attribution.ts',
      'payments/server/queries/payment.ts',
      'payments/settings/IntegrationsSettingsPage.tsx',
      'system/lib/oss-version.ts',
      'websites/lib/api-key.ts',
      'websites/lib/website-domain.ts',
      'websites/server/queries/websiteImport.ts',
      'websites/settings/WebsiteSettingsPage.tsx',
      'websites/settings/WebsitesSettingsPage.tsx',
      'workspaces/lib/workspace-invitations.ts',
      'workspaces/lib/workspace-members.ts',
      'workspaces/settings/WorkspaceSettingsPage.tsx',
    ];

    for (const path of expected) {
      expect(existsSync(join(FEATURES_ROOT, path)), `missing src/features/${path}`).toBe(true);
    }

    for (const stale of [
      'src/lib/dashboard-breakdown.ts',
      'src/lib/website-overview.ts',
      'src/lib/stripe-amount.ts',
      'src/lib/load.test.ts',
    ]) {
      expect(existsSync(join(process.cwd(), stale)), `${stale} should have moved`).toBe(false);
    }

    // The analytics workbench (reports, sessions, events, replay, realtime) and
    // its request handlers belong to the analytics domain. `websites` keeps
    // site management only: CRUD, settings, imports, API keys, members, shares.
    expect(
      existsSync(join(FEATURES_ROOT, 'websites/workbench')),
      'website analytics workbench should live under features/analytics/workbench',
    ).toBe(false);
    expect(existsSync(join(FEATURES_ROOT, 'analytics/server/[websiteId]/stats/handler.ts'))).toBe(
      true,
    );
    expect(
      existsSync(join(FEATURES_ROOT, 'websites/server/[websiteId]/stats/handler.ts')),
      'analytics handlers should live under features/analytics/server',
    ).toBe(false);
  });

  test('legacy keeps only the share-rendered link and pixel surfaces', () => {
    const allowed = new Set([
      'hooks/index.ts',
      'hooks/useLink.ts',
      'hooks/useLinkQuery.ts',
      'hooks/usePixel.ts',
      'hooks/usePixelQuery.ts',
      'lib/legacy-features.ts',
      'lib/permissions.ts',
      'links/LinkProvider.tsx',
      'links/[linkId]/LinkControls.tsx',
      'links/[linkId]/LinkHeader.tsx',
      'links/[linkId]/LinkMetricsBar.tsx',
      'links/[linkId]/LinkPage.tsx',
      'links/[linkId]/LinkPanels.tsx',
      'pixels/PixelProvider.tsx',
      'pixels/[pixelId]/PixelControls.tsx',
      'pixels/[pixelId]/PixelHeader.tsx',
      'pixels/[pixelId]/PixelMetricsBar.tsx',
      'pixels/[pixelId]/PixelPage.tsx',
      'pixels/[pixelId]/PixelPanels.tsx',
    ]);

    const unexpected = walk(join(FEATURES_ROOT, 'legacy'))
      .map(path => relative(join(FEATURES_ROOT, 'legacy'), path))
      .filter(path => !path.includes('.test.'))
      .filter(path => !path.startsWith('server/'))
      .filter(path => !allowed.has(path))
      .sort();

    expect(unexpected).toEqual([]);
  });

  test('settings is the settings shell only; each domain owns its settings screen', () => {
    const allowed = new Set([
      'SettingsHomePage.tsx',
      'SettingsLayout.tsx',
      'SettingsPageLayout.tsx',
    ]);

    const unexpected = walk(join(FEATURES_ROOT, 'settings'))
      .map(path => relative(join(FEATURES_ROOT, 'settings'), path))
      .filter(path => !allowed.has(path))
      .sort();

    expect(unexpected).toEqual([]);

    for (const legacy of [
      'account',
      'billing',
      'integrations',
      'preferences',
      'security',
      'websites',
      'workspace',
    ]) {
      expect(
        existsSync(join(FEATURES_ROOT, 'settings', legacy)),
        `settings/${legacy} should be owned by its product domain`,
      ).toBe(false);
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
