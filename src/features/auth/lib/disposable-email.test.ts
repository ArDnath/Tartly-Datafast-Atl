import { afterEach, describe, expect, test } from 'vitest';
import { emailDomain, isDisposableEmail } from './disposable-email';

const original = {
  allow: process.env.ALLOW_DISPOSABLE_EMAILS,
  domains: process.env.DISPOSABLE_EMAIL_DOMAINS,
};

afterEach(() => {
  process.env.ALLOW_DISPOSABLE_EMAILS = original.allow;
  process.env.DISPOSABLE_EMAIL_DOMAINS = original.domains;

  if (original.allow === undefined) {
    delete process.env.ALLOW_DISPOSABLE_EMAILS;
  }

  if (original.domains === undefined) {
    delete process.env.DISPOSABLE_EMAIL_DOMAINS;
  }
});

describe('disposable email detection', () => {
  test('extracts a lower-case domain', () => {
    expect(emailDomain('Person@Example.COM')).toBe('example.com');
    expect(emailDomain('not-an-email')).toBeNull();
    expect(emailDomain('a@')).toBeNull();
  });

  test('blocks a built-in disposable domain', () => {
    expect(isDisposableEmail('someone@mailinator.com')).toBe(true);
    expect(isDisposableEmail('someone@MAILINATOR.COM')).toBe(true);
  });

  test('blocks a subdomain of a known provider', () => {
    expect(isDisposableEmail('someone@inbox.mailinator.com')).toBe(true);
  });

  test('allows a normal mailbox', () => {
    expect(isDisposableEmail('founder@acme.dev')).toBe(false);
    expect(isDisposableEmail('not-an-email')).toBe(false);
  });

  test('supports an operator extension list', () => {
    process.env.DISPOSABLE_EMAIL_DOMAINS = 'burner.example, throwaway.example';

    expect(isDisposableEmail('a@burner.example')).toBe(true);
    expect(isDisposableEmail('a@throwaway.example')).toBe(true);
    expect(isDisposableEmail('a@acme.dev')).toBe(false);
  });

  test('can be disabled explicitly for a private/test deployment', () => {
    process.env.ALLOW_DISPOSABLE_EMAILS = 'true';

    expect(isDisposableEmail('someone@mailinator.com')).toBe(false);
  });
});
