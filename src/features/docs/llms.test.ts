import { describe, expect, test } from 'vitest';
import { buildLlmsTxt } from './llms';

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt('https://revenuelens.test');

  test('contains exactly the two plan prices from the config', () => {
    expect(text).toContain('Starter: $7.99/month');
    expect(text).toContain('Pro: $14.99/month');
    expect(text.match(/\$7\.99/g)).toHaveLength(1);
    expect(text.match(/\$14\.99/g)).toHaveLength(1);
  });

  test('uses the supplied origin for docs, install, and developer endpoints', () => {
    expect(text).toContain('https://revenuelens.test');
    expect(text).toContain('/script.js');
    expect(text).toContain('/api/developer/verify');
  });

  test('states that there is no free tier or trial', () => {
    expect(text).toContain('There is no free tier and no free trial');
  });

  test('does not claim fake usage', () => {
    expect(text).toContain('never fakes');
  });
});
