'use client';

import { useRef, useState } from 'react';
import {
  ArrowRight as ArrowRightIcon,
  Check as CheckIcon,
  Globe as GlobeIcon,
} from '@/components/icons';

const ERROR_MESSAGE = 'Enter a website like yoursite.com.';
const ERROR_ID = 'process-website-error';

/**
 * A host is what the signup route expects: no scheme, no trailing slash, no
 * whitespace, and at least one dot. A bare word ("localhost", "not a site") is
 * rejected before the form leaves the page.
 */
function normalizeHost(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

function isValidHost(value: string) {
  const host = normalizeHost(value);
  return host.length > 0 && !/\s/.test(host) && host.includes('.');
}

/**
 * The closing handoff. The form keeps the existing `/signup` GET contract; the
 * only addition is a client-side host check that names the problem in
 * `role="alert"` instead of letting a malformed value reach onboarding.
 */
export function ProcessCta() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const input = inputRef.current;

    if (!input || isValidHost(input.value)) {
      setError(null);
      return;
    }

    event.preventDefault();
    setError(ERROR_MESSAGE);
    input.focus();
  }

  return (
    <>
      <form
        action="/signup"
        method="get"
        noValidate
        onSubmit={handleSubmit}
        className="w-full max-w-xl"
      >
        <input type="hidden" name="returnUrl" value="/onboarding" />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row">
          <div className="lp-hero-input-wrap relative flex-1">
            <GlobeIcon
              className="lp-hero-input-icon pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-lp-fg-muted"
              aria-hidden="true"
            />
            <label htmlFor="process-website" className="sr-only">
              Website to add
            </label>
            <input
              ref={inputRef}
              id="process-website"
              name="website"
              type="text"
              autoComplete="url"
              required
              placeholder="yourwebsite.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
              onChange={() => {
                if (error) {
                  setError(null);
                }
              }}
              className="lp-hero-input lp-process-input h-12 w-full rounded-md border border-lp-line bg-lp-card pr-4 pl-10 text-[14px] font-medium text-lp-ink transition-colors placeholder:text-lp-fg-muted/60"
            />
          </div>

          <button
            type="submit"
            className="lp-btn-shadow lp-hero-submit lp-process-submit flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-lp-primary px-6 text-[13px] font-black tracking-[0.14em] whitespace-nowrap text-white uppercase"
          >
            Add your site
            <ArrowRightIcon
              className="lp-hero-submit-arrow lp-process-submit-arrow size-4"
              strokeWidth={3}
              aria-hidden="true"
            />
          </button>
        </div>

        {error ? (
          <p id={ERROR_ID} role="alert" className="lp-process-error">
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] font-medium text-lp-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
          One script tag
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckIcon className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden="true" />
          First event before you pay
        </span>
      </p>
    </>
  );
}
