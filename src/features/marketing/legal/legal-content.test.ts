import { describe, expect, test } from 'vitest';
import { LEGAL_DOCUMENTS, LEGAL_DRAFT_NOTICE, getLegalDocument } from './legal-content';

describe('legal content', () => {
  test('every document has a unique slug and at least one section', () => {
    const slugs = LEGAL_DOCUMENTS.map(document => document.slug);

    expect(new Set(slugs).size).toBe(slugs.length);

    for (const document of LEGAL_DOCUMENTS) {
      expect(document.sections.length).toBeGreaterThan(0);
      expect(document.summary.length).toBeGreaterThan(10);
    }
  });

  test('the required documents exist', () => {
    for (const slug of ['privacy', 'terms', 'cookies', 'dpa', 'subprocessors', 'acceptable-use']) {
      expect(getLegalDocument(slug), slug).toBeDefined();
    }
  });

  test('the draft notice tells readers this is not legal advice', () => {
    expect(LEGAL_DRAFT_NOTICE).toContain('not legal advice');
    expect(LEGAL_DRAFT_NOTICE).toContain('lawyer review');
  });

  test('does not claim a certification that is not implemented', () => {
    const text = JSON.stringify(LEGAL_DOCUMENTS).toLowerCase();

    for (const claim of ['soc 2 certified', 'gdpr certified', 'iso 27001 certified']) {
      expect(text).not.toContain(claim);
    }
  });
});
