'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useApi } from '@/components/hooks';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { BRAND } from '@/lib/brand';
import {
  getStepIndex,
  type OnboardingStep,
  resolveOnboardingStep,
} from '@/features/onboarding/lib/steps';
import { normalizeWebsiteDomain } from '@/features/onboarding/lib/website-domain';
import { BackGlyph, Spinner } from './components/OnboardingControls';
import styles from './Onboarding.module.css';
import { PaymentStep } from './steps/PaymentStep';
import { TrackerStep } from './steps/TrackerStep';
import { WebsiteStep } from './steps/WebsiteStep';

type Direction = 'forward' | 'backward';

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  planId: string | null;
  subscriptionStatus: string;
  onboardingCompletedAt?: string | null;
  role: string;
}

interface WebsiteSummary {
  id: string;
  name: string;
  domain: string | null;
  workspaceId: string | null;
}

interface WorkspaceListItem {
  role: string;
  workspace: Omit<WorkspaceSummary, 'role'>;
}

interface ConnectionSummary {
  providerName: string;
  connectionStatus: string;
  webhookStatus: string;
  hasCredentials: boolean;
}

interface OnboardingWebsiteResponse {
  workspace: WorkspaceSummary;
  website: WebsiteSummary;
}

export function OnboardingFlow({ initialWebsite }: { initialWebsite?: string } = {}) {
  const router = useRouter();
  const { get: apiGet, post: apiPost } = useApi();
  const { user, setUser, isLoading: authLoading } = useLoginQuery();
  const userId = user?.id;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<OnboardingStep>('website');
  const [direction, setDirection] = useState<Direction>('forward');
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [website, setWebsite] = useState<WebsiteSummary | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [domain, setDomain] = useState(() => normalizeWebsiteDomain(initialWebsite ?? '') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/onboarding')}`);
      return;
    }

    let cancelled = false;

    apiGet('/workspaces')
      .then(async (items: WorkspaceListItem[] = []) => {
        if (cancelled) {
          return;
        }

        const owned =
          items.find(item => item.role === 'OWNER' && !item.workspace.onboardingCompletedAt) ||
          items.find(item => item.role === 'OWNER');

        // A brand-new account has no membership yet. It must stay here and
        // create its workspace from the website step; sending it to /app makes
        // the shell bounce straight back to /onboarding (an endless redirect).
        // Invited members already have a membership but no OWNER role, so they
        // belong in the app instead.
        if (!owned) {
          if (items.length === 0) {
            setStep('website');
            setReady(true);
            return;
          }

          router.replace('/app');
          return;
        }

        const current: WorkspaceSummary = { ...owned.workspace, role: owned.role };

        setWorkspace(current);

        if (current.onboardingCompletedAt) {
          router.replace('/app');
          return;
        }

        try {
          const response = (await apiGet('/websites', {
            workspaceId: current.id,
            pageSize: 1,
          })) as { data?: WebsiteSummary[] };
          const firstWebsite = response.data?.[0];

          if (!firstWebsite) {
            setStep('website');
            setReady(true);
            return;
          }

          setWebsite(firstWebsite);
          setDomain(firstWebsite.domain || '');

          let hasPaymentConnection = false;

          try {
            const connections = (await apiGet(
              `/websites/${firstWebsite.id}/payment-provider-connections`,
            )) as { data?: ConnectionSummary[] };
            const active = (connections.data || []).filter(
              connection =>
                connection.hasCredentials &&
                connection.connectionStatus === 'active' &&
                connection.webhookStatus === 'configured',
            );

            hasPaymentConnection = active.length > 0;
            setConnectedProviders(active.map(connection => connection.providerName));
          } catch {
            // A provider lookup failure must not block the tracker step.
          }

          if (cancelled) {
            return;
          }

          const nextStep = resolveOnboardingStep({
            hasWorkspace: true,
            onboardingCompletedAt: null,
            hasWebsite: true,
            hasPaymentConnection,
          });

          if (nextStep === 'complete') {
            router.replace('/app');
            return;
          }

          setStep(nextStep);
          setReady(true);
        } catch (cause) {
          if (!cancelled) {
            setLoadError(
              cause instanceof Error ? cause.message : 'Could not load your setup progress.',
            );
            setReady(true);
          }
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(
            cause instanceof Error ? cause.message : 'Could not load your setup progress.',
          );
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiGet, authLoading, router, userId]);

  function go(next: OnboardingStep, nextDirection: Direction = 'forward') {
    setError(null);
    setDirection(nextDirection);
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleWebsiteSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const normalized = normalizeWebsiteDomain(domain);

    if (!normalized?.includes('.')) {
      setError('Enter the domain you want to track, for example acme.com.');
      return;
    }

    setBusy(true);

    try {
      if (website) {
        const nextWebsite =
          website.domain === normalized
            ? website
            : ((await apiPost(`/websites/${website.id}`, {
                domain: normalized,
                name: normalized,
              })) as WebsiteSummary);

        setWebsite(nextWebsite);
        setDomain(normalized);
      } else {
        const result = (await apiPost('/onboarding/website', {
          domain: normalized,
        })) as OnboardingWebsiteResponse;

        setWorkspace(result.workspace);
        setWebsite(result.website);
        setDomain(normalized);

        if (user) {
          setUser({ ...user, onboardingRequired: true });
        }
      }

      go('tracker');
    } catch (cause) {
      if ((cause as { code?: string })?.code === 'already-onboarded') {
        router.replace('/app');
        return;
      }

      setError(cause instanceof Error ? cause.message : 'Could not save your website.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!workspace) {
      setError('Your workspace is not ready yet. Refresh the page and try again.');
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await apiPost('/onboarding/complete', { workspaceId: workspace.id });

      if (user) {
        setUser({ ...user, onboardingRequired: false });
      }

      // The singleton welcome gate reads this flag once and then rewrites the
      // URL, so a refresh never replays the animation.
      router.replace('/app?welcome=1');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish setup.');
      setBusy(false);
    }
  }

  if (authLoading || !ready) {
    return (
      <main className={styles.page} aria-label={`${BRAND.name} setup`}>
        <ThemeToggle floating />
        <div className={styles.loading}>
          <BrandMark size={48} />
          <Spinner />
          <p>Getting things ready…</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className={styles.page} aria-label={`${BRAND.name} setup`}>
        <ThemeToggle floating />
        <div className={styles.loading}>
          <BrandMark size={48} />
          <p>We could not load your setup progress.</p>
          <p className={styles.error}>{loadError}</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const currentIndex = getStepIndex(step);
  const isFirstStep = currentIndex === 0;

  return (
    <main className={styles.page} aria-label={`${BRAND.name} setup`}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          aria-label="Go back"
          disabled={isFirstStep || busy}
          onClick={() => {
            if (step === 'tracker') {
              go('website', 'backward');
            } else if (step === 'payments') {
              go('tracker', 'backward');
            }
          }}
        >
          <BackGlyph />
        </button>
        <div className={styles.headerMeta}>
          <span className={styles.stepMeta}>{`${currentIndex + 1} of 3`}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.body}>
        <div
          key={step}
          className={`${styles.stepPanel} ${direction === 'backward' ? styles.backward : ''}`}
        >
          {step === 'website' && (
            <WebsiteStep
              domain={domain}
              busy={busy}
              error={error}
              editing={Boolean(website)}
              onDomainChange={setDomain}
              onSubmit={event => void handleWebsiteSubmit(event)}
            />
          )}

          {step === 'tracker' && website && (
            <TrackerStep
              website={website}
              onBack={() => go('website', 'backward')}
              onContinue={() => go('payments')}
            />
          )}

          {step === 'payments' && website && (
            <PaymentStep
              websiteId={website.id}
              connectedProviders={connectedProviders}
              busy={busy}
              error={error}
              onBack={() => go('tracker', 'backward')}
              onFinish={() => void handleFinish()}
              onConnected={providerName =>
                setConnectedProviders(current =>
                  current.includes(providerName) ? current : [...current, providerName],
                )
              }
            />
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <Link className={styles.signOut} href="/logout">
          Sign out
        </Link>
      </footer>
    </main>
  );
}
