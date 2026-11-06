import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import { BRAND } from './brand';

const SRC = join(process.cwd(), 'src');
const ROOTS = ['features', 'lib'].map(root => join(SRC, root));

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry);

    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('brand configuration propagation', () => {
  test('customer-facing source reads the brand config instead of a literal name', () => {
    const offenders = ROOTS.flatMap(walk)
      .filter(file => /\.(ts|tsx)$/.test(file))
      .filter(file => !file.includes('.test.'))
      .filter(file => relative(SRC, file) !== 'lib/brand.ts')
      .filter(file => {
        const content = readFileSync(file, 'utf8');

        // Flag the retired name and any hardcode of the current name.
        return content.includes('RevenueLens') || content.includes(BRAND.name);
      })
      .map(file => relative(SRC, file));

    expect(offenders).toEqual([]);
  });

  test('urls, emails, and legal entity are derived from the same name and domain', () => {
    expect(BRAND.url).toBe(`https://${BRAND.domain}`);
    expect(BRAND.supportEmail).toBe(`support@${BRAND.domain}`);
    expect(BRAND.noReplyEmail).toContain(BRAND.name);
    expect(BRAND.noReplyEmail).toContain(`@${BRAND.domain}`);
    expect(BRAND.logo.alt).toBe(BRAND.name);
    expect(BRAND.legalEntity).toBe(BRAND.name);
  });

  test('the main customer surfaces import the shared brand config', () => {
    const surfaces = [
      'app/layout.tsx',
      'features/app-shell/TopNav.tsx',
      'features/auth/LoginForm.tsx',
      'features/docs/content.ts',
      'features/docs/DocsPage.tsx',
      'features/marketing/LandingPage.tsx',
      'features/marketing/PricingPage.tsx',
      'features/onboarding/OnboardingFlow.tsx',
      'lib/email.ts',
    ];

    for (const surface of surfaces) {
      const content = readFileSync(join(SRC, surface), 'utf8');

      expect(content, `${surface} should read BRAND`).toContain('BRAND');
    }
  });
});
