'use client';

import type { FormEvent } from 'react';
import { Reveal, Spinner, StepHeading } from '../components/OnboardingControls';
import styles from '../Onboarding.module.css';

export function WebsiteStep({
  domain,
  busy,
  error,
  editing,
  onDomainChange,
  onSubmit,
}: {
  domain: string;
  busy: boolean;
  error: string | null;
  editing: boolean;
  onDomainChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <>
      <StepHeading
        title="Start tracking revenue"
        subtitle="Add the website or app where you want to see which channels make money. We set up everything behind it for you."
      />

      <form className={styles.form} onSubmit={onSubmit}>
        <Reveal index={1}>
          <label className={styles.label} htmlFor="website-domain">
            Website URL
          </label>
          <input
            id="website-domain"
            className={styles.input}
            value={domain}
            placeholder="acme.com"
            autoFocus
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="url"
            onChange={event => onDomainChange(event.target.value)}
          />
          <p className={styles.hint}>
            Use the address visitors see in the browser. We normalize HTTPS, paths, and query
            strings to the domain.
          </p>
        </Reveal>

        {error && <p className={styles.error}>{error}</p>}

        <Reveal index={2}>
          <button className={styles.primary} type="submit" disabled={busy}>
            {busy && <Spinner />}
            {editing ? 'Save and continue' : 'Continue'}
          </button>
        </Reveal>

        <Reveal index={3}>
          <p className={styles.inlineNote}>
            One tracker script. One payment connection. No workspace setup required.
          </p>
        </Reveal>
      </form>
    </>
  );
}
