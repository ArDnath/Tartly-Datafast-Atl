'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/components/hooks';
import {
  InstallExperience,
  type InstallVerifyState,
} from '@/features/websites/components/InstallExperience';
import { BRAND } from '@/lib/brand';
import { Reveal, StepHeading } from '../components/OnboardingControls';
import styles from '../Onboarding.module.css';

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
  const [hostUrl, setHostUrl] = useState<string>(BRAND.url);
  const [verify, setVerify] = useState<InstallVerifyState | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostUrl(window.location.origin);
    }
  }, []);

  const checkInstallation = useCallback(async () => {
    try {
      const result = (await apiGet(
        `/websites/${website.id}/onboarding/verify`,
      )) as InstallVerifyState;

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

  const displayVerify = verify ?? { installed: false, eventCount: 0, lastEventAt: null };

  return (
    <>
      <StepHeading
        title="Install the tracker"
        subtitle={`Paste one script into ${website.domain || 'your site'} so ${BRAND.name} can measure visits, sessions, and the path to revenue.`}
      />

      <div className={styles.form}>
        <InstallExperience
          websiteId={website.id}
          domain={website.domain}
          hostUrl={hostUrl}
          variant="onboarding"
          verify={displayVerify}
          verifyError={verifyError}
          onCheckVerify={() => void checkInstallation()}
          renderSection={(index, node) => <Reveal index={index + 1}>{node}</Reveal>}
        />

        <Reveal index={5} className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onBack}>
            Back
          </button>
          <button type="button" className={styles.primary} onClick={onContinue}>
            Continue
          </button>
        </Reveal>

        <Reveal index={6}>
          <p className={styles.inlineNote}>
            The tracker only needs the website ID. It is a public identifier, not a secret. You can
            verify the install later in Settings → Websites.
          </p>
        </Reveal>
      </div>
    </>
  );
}
