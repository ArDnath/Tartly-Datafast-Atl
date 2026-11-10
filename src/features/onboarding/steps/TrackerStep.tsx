'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/components/hooks';
import { getInstallGuide, getInstallSnippet, INSTALL_GUIDES } from '@/features/docs/install-guides';
import { BRAND } from '@/lib/brand';
import { CopyGlyph, Reveal, StepHeading } from '../components/OnboardingControls';
import styles from '../Onboarding.module.css';

interface VerifyState {
  installed: boolean;
  eventCount: number;
  lastEventAt: string | null;
}

export function TrackerStep({
  website,
  onContinue,
  onBack,
}: {
  website: { id: string; domain: string | null };
  onContinue: () => void;
  onBack: () => void;
}) {
  const { get: apiGet } = useApi();
  const [guideSlug, setGuideSlug] = useState('html');
  const [hostUrl, setHostUrl] = useState<string>(BRAND.url);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyState | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const guide = getInstallGuide(guideSlug) || INSTALL_GUIDES[0];
  const code = getInstallSnippet(guide, {
    websiteId: website.id,
    domain: website.domain || undefined,
    hostUrl,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostUrl(window.location.origin);
    }
  }, []);

  const checkInstallation = useCallback(async () => {
    try {
      const result = (await apiGet(`/websites/${website.id}/onboarding/verify`)) as VerifyState;

      setVerify(result);
      setVerifyError(null);
    } catch (cause) {
      setVerifyError(
        cause instanceof Error ? cause.message : 'Could not check the tracker right now.',
      );
    }
  }, [apiGet, website.id]);

  useEffect(() => {
    let active = true;

    void checkInstallation();

    const interval = setInterval(() => {
      if (active) {
        void checkInstallation();
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkInstallation]);

  async function handleCopy() {
    setCopyError(null);

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError('Copy failed. Select the code and copy it manually.');
    }
  }

  return (
    <>
      <StepHeading
        title="Install the tracker"
        subtitle={`Paste one script into ${website.domain || 'your site'} so ${BRAND.name} can measure visits, sessions, and the path to revenue.`}
      />

      <div className={styles.form}>
        <Reveal index={1} className={styles.codeCard}>
          <div className={styles.codeHeader}>
            <div className={styles.tabs} role="tablist" aria-label="Install target">
              {INSTALL_GUIDES.map(item => (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={item.slug === guide.slug}
                  className={`${styles.tab} ${item.slug === guide.slug ? styles.tabActive : ''}`}
                  onClick={() => setGuideSlug(item.slug)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>

          <pre className={styles.codeBlock}>
            <code>{code}</code>
          </pre>

          <div className={styles.codeFooter}>
            <Link className={styles.link} href={`/docs/install#${guide.slug}`}>
              Open the {guide.title} guide
            </Link>
            <button type="button" className={styles.copyButton} onClick={() => void handleCopy()}>
              <CopyGlyph />
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        </Reveal>

        {copyError && <p className={styles.error}>{copyError}</p>}

        <Reveal index={2} className={styles.statusCard} data-installed={verify?.installed || false}>
          <span className={styles.statusDot} aria-hidden="true" />
          <div className={styles.statusCopy}>
            <p className={styles.statusTitle}>
              {verify?.installed ? 'Tracker connected' : 'Waiting for the first event'}
            </p>
            <p className={styles.statusDetail}>
              {verify?.installed
                ? `${verify.eventCount.toLocaleString('en-US')} event${verify.eventCount === 1 ? '' : 's'} received. Live verification reads the event store.`
                : 'Open your site once after deploying the script. This check refreshes every five seconds.'}
            </p>
          </div>
          <button
            type="button"
            className={styles.statusAction}
            onClick={() => void checkInstallation()}
          >
            Check now
          </button>
        </Reveal>

        {verifyError && <p className={styles.error}>{verifyError}</p>}

        <Reveal index={3} className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onBack}>
            Back
          </button>
          <button type="button" className={styles.primary} onClick={onContinue}>
            Continue
          </button>
        </Reveal>

        <Reveal index={4}>
          <p className={styles.inlineNote}>
            The tracker only needs the website ID. It is a public identifier, not a secret. You can
            verify the install later in Settings → Websites.
          </p>
        </Reveal>
      </div>
    </>
  );
}
