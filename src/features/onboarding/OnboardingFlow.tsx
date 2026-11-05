'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark, BrandWordmark } from '@/components/brand/BrandMark';
import { useApi } from '@/components/hooks';
import { useLoginQuery } from '@/features/auth/hooks/useLoginQuery';
import { BRAND } from '@/lib/brand';
import styles from './Onboarding.module.css';

type Step = 'welcome' | 'workspace' | 'website' | 'install' | 'verify' | 'payments' | 'done';
type Direction = 'forward' | 'backward';

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  planId: string | null;
  subscriptionStatus: string;
  role: string;
}

interface VerifyState {
  installed: boolean;
  eventCount: number;
  lastEventAt: string | null;
}

const ORDERED_STEPS: Exclude<Step, 'welcome' | 'done'>[] = [
  'workspace',
  'website',
  'install',
  'verify',
  'payments',
];

const STEP_LABEL: Record<Exclude<Step, 'welcome' | 'done'>, string> = {
  workspace: 'Workspace',
  website: 'Website',
  install: 'Tracker',
  verify: 'Verify',
  payments: 'Revenue',
};

function StepHeading({
  title,
  subtitle,
  index = 0,
}: {
  title: string;
  subtitle: string;
  index?: number;
}) {
  return (
    <div className={styles.heading} style={{ animationDelay: `${index * 70}ms` }}>
      <BrandMark size={44} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}

function Reveal({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <div
      className={`${styles.reveal} ${className || ''}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

export function OnboardingFlow() {
  const router = useRouter();
  const { get: apiGet, post: apiPost } = useApi();
  const { user, isLoading: authLoading } = useLoginQuery();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [direction, setDirection] = useState<Direction>('forward');
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [hadWorkspaceAtStart, setHadWorkspaceAtStart] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [domain, setDomain] = useState('');
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [createdWebsiteDomain, setCreatedWebsiteDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?returnUrl=${encodeURIComponent('/onboarding')}`);
      return;
    }

    let cancelled = false;

    apiGet('/workspaces')
      .then((items: { role: string; workspace: Omit<WorkspaceSummary, 'role'> }[] = []) => {
        if (cancelled) return;

        if (items.length > 0) {
          const first = items[0];
          setWorkspace({ ...first.workspace, role: first.role });
          setHadWorkspaceAtStart(true);
        }

        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiGet, authLoading, router, user]);

  // The welcome moment mirrors Tartly: hold the wordmark for a beat, then
  // hand off to the first step. A click or reduced motion skips the hold.
  useEffect(() => {
    if (step !== 'welcome' || !ready) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(
      () => {
        setDirection('forward');
        setStep(workspace ? 'website' : 'workspace');
      },
      reduceMotion ? 900 : 4200,
    );

    return () => clearTimeout(timer);
  }, [ready, step, workspace]);

  const flowSteps = useMemo(
    () => (hadWorkspaceAtStart ? ORDERED_STEPS.slice(1) : ORDERED_STEPS),
    [hadWorkspaceAtStart],
  );

  const currentIndex = flowSteps.indexOf(step as (typeof flowSteps)[number]);
  const progress =
    step === 'done'
      ? 100
      : currentIndex < 0
        ? 0
        : Math.round(((currentIndex + 0.35) / flowSteps.length) * 100);
  const previousStep = currentIndex > 0 ? flowSteps[currentIndex - 1] : null;

  function go(next: Step, nextDirection: Direction = 'forward') {
    setError(null);
    setDirection(nextDirection);
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function finishWelcome() {
    setDirection('forward');
    setStep(workspace ? 'website' : 'workspace');
  }

  async function handleCreateWorkspace(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (workspaceName.trim().length < 2) {
      setError('Give your workspace a name with at least 2 characters.');
      return;
    }

    setBusy(true);

    try {
      const created = (await apiPost('/workspaces', {
        name: workspaceName.trim(),
      })) as WorkspaceSummary;
      setWorkspace(created);
      setWorkspaceName('');
      go('website');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the workspace.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWebsite(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const normalized = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (!normalized?.includes('.')) {
      setError('Enter the domain you want to track, for example acme.com.');
      return;
    }

    if (!workspace) {
      setError('Create a workspace first.');
      return;
    }

    setBusy(true);

    try {
      const created = (await apiPost('/websites', {
        name: normalized,
        domain: normalized,
        workspaceId: workspace.id,
      })) as { id: string };

      setWebsiteId(created.id);
      setCreatedWebsiteDomain(normalized);
      setDomain('');
      go('install');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the website.');
    } finally {
      setBusy(false);
    }
  }

  const snippet =
    websiteId && typeof window !== 'undefined'
      ? `<script defer src="${window.location.origin}/script.js" data-website-id="${websiteId}"${
          createdWebsiteDomain ? ` data-domain="${createdWebsiteDomain}"` : ''
        }></script>`
      : '';

  async function handleCopy() {
    if (!snippet) return;

    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed. Select the snippet and copy it manually.');
    }
  }

  async function checkInstallation(manual = false) {
    if (!websiteId) return;

    if (manual) setVerifyError(null);

    try {
      const result = (await apiGet(`/websites/${websiteId}/onboarding/verify`)) as VerifyState;
      setVerifyState(result);
      setVerifyError(null);
    } catch (cause) {
      if (manual) {
        setVerifyError(
          cause instanceof Error ? cause.message : 'Could not check the installation.',
        );
      }
    }
  }

  useEffect(() => {
    if (step !== 'verify' || !websiteId) return;

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    setVerifyState(null);
    setVerifyError(null);

    const poll = async () => {
      try {
        const result = (await apiGet(`/websites/${websiteId}/onboarding/verify`)) as VerifyState;
        if (!active) return;
        setVerifyState(result);
        if (result.installed && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch {
        if (active) setVerifyError('Still waiting for the first event. Is the script deployed?');
      }
    };

    void poll();
    timer = setInterval(() => void poll(), 3000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [apiGet, step, websiteId]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  if (authLoading || !ready) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <BrandMark size={48} />
          <Spinner />
          <p>Preparing your workspace…</p>
        </div>
      </main>
    );
  }

  if (step === 'welcome') {
    return (
      <main className={styles.page}>
        <div className={styles.welcome}>
          <div className={styles.halftone} aria-hidden="true" />
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeMark}>
              <BrandMark size={64} />
            </div>
            <p className={styles.eyebrow}>{BRAND.name}</p>
            <h1 className={styles.welcomeTitle}>Welcome to {BRAND.name}</h1>
            <p className={styles.welcomeSubtitle}>{BRAND.promise} This takes about two minutes.</p>
            <button type="button" className={styles.primary} onClick={finishWelcome}>
              Get started
            </button>
            <button type="button" className={styles.textButton} onClick={finishWelcome}>
              Skip intro
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerTop}>
            <Link href="/app" className={styles.headerBrand} aria-label={BRAND.name}>
              <BrandWordmark size={22} />
            </Link>
            <span className={styles.stepCount}>
              {step === 'done'
                ? 'Complete'
                : `${Math.min(currentIndex + 1, flowSteps.length)} of ${flowSteps.length}`}
              <span className={styles.stepName}>
                {step === 'done' ? '' : STEP_LABEL[step as keyof typeof STEP_LABEL]}
              </span>
            </span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <div
          key={step}
          className={`${styles.stepPanel} ${direction === 'backward' ? styles.backward : ''}`}
        >
          {step !== 'done' && (
            <div className={styles.backRow}>
              <button
                type="button"
                className={styles.backButton}
                disabled={!previousStep || busy}
                onClick={() => previousStep && go(previousStep, 'backward')}
              >
                ← Back
              </button>
            </div>
          )}

          {step === 'workspace' && (
            <>
              <StepHeading
                title="Name your workspace"
                subtitle="This is the home for your websites, revenue, and (eventually) your team."
              />
              <form className={styles.form} onSubmit={handleCreateWorkspace}>
                <Reveal index={1}>
                  <label className={styles.label} htmlFor="workspace-name">
                    Workspace name
                  </label>
                  <input
                    id="workspace-name"
                    className={styles.input}
                    value={workspaceName}
                    placeholder="Acme Studio"
                    autoFocus
                    maxLength={100}
                    onChange={event => setWorkspaceName(event.target.value)}
                  />
                  <p className={styles.hint}>
                    You can rename it later. Your workspace URL will be generated automatically.
                  </p>
                </Reveal>
                {error && <p className={styles.error}>{error}</p>}
                <Reveal index={2}>
                  <button className={styles.primary} type="submit" disabled={busy}>
                    {busy && <Spinner />}
                    Create workspace
                  </button>
                </Reveal>
              </form>
            </>
          )}

          {step === 'website' && (
            <>
              <StepHeading
                title="Add your first website"
                subtitle="Install the tracker once and every page, referrer, and payment can be connected back to it."
              />
              <form className={styles.form} onSubmit={handleCreateWebsite}>
                <Reveal index={1}>
                  <label className={styles.label} htmlFor="website-domain">
                    Website domain
                  </label>
                  <input
                    id="website-domain"
                    className={styles.input}
                    value={domain}
                    placeholder="acme.com"
                    autoFocus
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="url"
                    onChange={event => setDomain(event.target.value)}
                  />
                  <p className={styles.hint}>
                    Use the domain visitors see in the browser. You can add more later on Pro.
                  </p>
                </Reveal>
                {error && <p className={styles.error}>{error}</p>}
                <Reveal index={2}>
                  <button className={styles.primary} type="submit" disabled={busy}>
                    {busy && <Spinner />}
                    Create website
                  </button>
                </Reveal>
              </form>
            </>
          )}

          {step === 'install' && (
            <>
              <StepHeading
                title="Install the tracker"
                subtitle={`Paste this snippet before the closing </body> tag on every page of ${createdWebsiteDomain}.`}
              />
              <Reveal index={1} className={styles.codeCard}>
                <pre className={styles.code}>{snippet}</pre>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => void handleCopy()}
                >
                  {copied ? 'Copied' : 'Copy snippet'}
                </button>
              </Reveal>
              <Reveal index={2}>
                <p className={styles.hint}>
                  With Next.js, put it in the root layout. With plain HTML, paste it once per page.
                  Ad blockers can block analytics requests — test in a normal browser profile.
                </p>
              </Reveal>
              {error && <p className={styles.error}>{error}</p>}
              <Reveal index={3} className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => go('verify')}>
                  I installed it
                </button>
                <button type="button" className={styles.secondary} onClick={() => go('payments')}>
                  Skip for now
                </button>
              </Reveal>
            </>
          )}

          {step === 'verify' && (
            <>
              <StepHeading
                title={
                  verifyState?.installed
                    ? 'Your first event is here'
                    : 'Waiting for your first event'
                }
                subtitle={
                  verifyState?.installed
                    ? `The tracker is live. ${BRAND.name} is now recording visits for this website.`
                    : 'Open your site in another tab. This page checks every 3 seconds.'
                }
              />
              <Reveal index={1} className={styles.statusCard}>
                <div
                  className={styles.statusIcon}
                  data-state={verifyState?.installed ? 'ok' : 'waiting'}
                >
                  {verifyState?.installed ? '✓' : <Spinner />}
                </div>
                <div>
                  <p className={styles.statusTitle}>
                    {verifyState?.installed
                      ? 'Tracker confirmed'
                      : verifyState
                        ? 'No events yet'
                        : 'Checking the installation'}
                  </p>
                  <p className={styles.statusDetail}>
                    {verifyState?.installed
                      ? `${verifyState.eventCount.toLocaleString('en-US')} event${
                          verifyState.eventCount === 1 ? '' : 's'
                        } received${verifyState.lastEventAt ? ` · last at ${new Date(verifyState.lastEventAt).toLocaleTimeString()}` : ''}`
                      : 'Nothing has arrived yet. This is normal if you just deployed the script.'}
                  </p>
                </div>
              </Reveal>
              {verifyError && <p className={styles.error}>{verifyError}</p>}
              <Reveal index={2} className={styles.actions}>
                {verifyState?.installed ? (
                  <button type="button" className={styles.primary} onClick={() => go('payments')}>
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => void checkInstallation(true)}
                  >
                    Check now
                  </button>
                )}
                <a
                  className={styles.secondary}
                  href={`https://${createdWebsiteDomain}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open {createdWebsiteDomain}
                </a>
                {!verifyState?.installed && (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => go('payments')}
                  >
                    Skip for now
                  </button>
                )}
              </Reveal>
            </>
          )}

          {step === 'payments' && (
            <>
              <StepHeading
                title="Connect your payments"
                subtitle={`${BRAND.name} can show which channels produce revenue once a provider is connected.`}
              />
              <Reveal index={1} className={styles.providerGrid}>
                {['Stripe', 'Dodo Payments', 'Polar', 'Lemon Squeezy'].map(provider => (
                  <span key={provider} className={styles.providerChip}>
                    {provider}
                  </span>
                ))}
              </Reveal>
              <Reveal index={2}>
                <p className={styles.hint}>
                  Connections are stored encrypted and are scoped to this website. You can add or
                  remove them at any time. This step is optional.
                </p>
              </Reveal>
              <Reveal index={3} className={styles.actions}>
                {websiteId && (
                  <Link className={styles.primary} href={`/app/${websiteId}/settings#payments`}>
                    Open payment settings
                  </Link>
                )}
                <button type="button" className={styles.secondary} onClick={() => go('done')}>
                  I&apos;ll do this later
                </button>
              </Reveal>
            </>
          )}

          {step === 'done' && (
            <>
              <StepHeading
                title="You're in"
                subtitle="Your workspace is ready and the dashboard is already collecting traffic."
              />
              <Reveal index={1} className={styles.summaryCard}>
                <div>
                  <span className={styles.summaryLabel}>Workspace</span>
                  <strong>{workspace?.name}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>Website</span>
                  <strong>{createdWebsiteDomain}</strong>
                </div>
                <div>
                  <span className={styles.summaryLabel}>Plan</span>
                  <strong>
                    {workspace?.planId ? workspace.planId : 'Choose a plan in billing'}
                  </strong>
                </div>
              </Reveal>
              <Reveal index={2} className={styles.actions}>
                {websiteId ? (
                  <Link className={styles.primary} href={`/app/${websiteId}`}>
                    Open dashboard
                  </Link>
                ) : (
                  <Link className={styles.primary} href="/app">
                    Open dashboard
                  </Link>
                )}
                <Link className={styles.secondary} href="/app">
                  Go to workspace
                </Link>
              </Reveal>
              <Reveal index={3}>
                <p className={styles.hint}>
                  Need the install guide again? It lives in the website settings under Tracking.
                </p>
              </Reveal>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
