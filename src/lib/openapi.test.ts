import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const spec = readFileSync(join(process.cwd(), 'openapi.yaml'), 'utf8');

describe('OpenAPI contract', () => {
  test('declares OpenAPI 3.1', () => {
    expect(spec).toMatch(/^openapi: 3\.1\.0$/m);
  });

  test('documents every public/operator surface in this repository', () => {
    for (const path of [
      '/api/health/live:',
      '/api/health/ready:',
      '/api/auth/login:',
      '/api/auth/register:',
      '/api/me/export:',
      '/api/developer/verify:',
      '/api/developer/events:',
      '/api/developer/diagnose:',
      '/api/admin/accounts:',
      '/api/admin/audit:',
      '/api/admin/users/{userId}/suspension:',
      '/api/admin/workspaces/{workspaceId}/suspension:',
      '/api/billing/webhook/dodo:',
    ]) {
      expect(spec).toContain(path);
    }
  });

  test('uses one schemas block and references the shared Error schema', () => {
    expect(spec.match(/^ {2}schemas:$/gm)).toHaveLength(1);
    expect(spec).toContain('#/components/schemas/Error');
    expect(spec).toContain('websiteApiKey');
  });
});
