'use client';

import { TextField } from '@talivia/react-zen';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import type { PreflightResponse } from '@/features/analytics/lib/preflight-types';
import {
  FIRST_PARTY_GUIDES,
  getFirstPartyGuideForHost,
  getInstallGuide,
  getInstallSnippet,
  type InstallGuide,
  type InstallMode,
  STANDARD_GUIDES,
} from '@/features/docs/install-guides';
import { BRAND } from '@/lib/brand';
import { useInstallPreflight } from '../hooks/useInstallPreflight';
import styles from './InstallExperience.module.css';

export interface InstallVerifyState {
  installed: boolean;
  eventCount: number;
  lastEventAt: string | null;
}

interface InstallExperienceProps {
  websiteId: string;
  domain?: string | null;
  hostUrl?: string;
  variant: 'onboarding' | 'settings';
  verify?: InstallVerifyState | null;
  verifyError?: string | null;
  onCheckVerify?: () => void;
  crossDomainDomains?: string[];
  renderSection?: (index: number, node: ReactNode) => ReactNode;
}

function hostTabLabel(title: string) {
  return title.replace(' (first-party)', '');
}

function isSupportedHost(host: PreflightResponse['host']) {
  return ['nextjs', 'vercel', 'netlify', 'cloudflare'].includes(host.id);
}

function detectedHostCopy(host: PreflightResponse['host'] | null) {
  if (!host) {
    return 'Choose the host that matches your site.';
  }

  if (isSupportedHost(host) && host.confidence !== 'low') {
    return `Detected ${host.label}. Choose another host if that is not right.`;
  }

  if (host.id !== 'unknown') {
    return `We detected ${host.label}, but its first-party guide is not available yet. Choose the closest host below.`;
  }

  return 'Choose the host that matches your site.';
}

export function InstallExperience({
  websiteId,
  domain,
  hostUrl,
  variant,
  verify = null,
  verifyError = null,
  onCheckVerify,
  crossDomainDomains,
  renderSection,
}: InstallExperienceProps) {
  const { data: preflight, loading, check } = useInstallPreflight(websiteId);
  const [manualMode, setManualMode] = useState<InstallMode | null>(null);
  const [standardGuideSlug, setStandardGuideSlug] = useState('html');
  const [firstPartyGuideSlug, setFirstPartyGuideSlug] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const detectedHost = preflight?.host ?? {
    id: 'unknown' as const,
    label: 'Unknown host',
    confidence: 'low' as const,
  };
  const recommendedMode = preflight?.recommendedMode ?? 'standard';
  const mode: InstallMode = manualMode ?? recommendedMode;
  const firstPartyGuide =
    getInstallGuide(firstPartyGuideSlug || getFirstPartyGuideForHost(detectedHost.id).slug) ??
    getFirstPartyGuideForHost(detectedHost.id);
  const standardGuide = getInstallGuide(standardGuideSlug) ?? STANDARD_GUIDES[3];
  const guide: InstallGuide = mode === 'first-party' ? firstPartyGuide : standardGuide;

  const installContext = {
    websiteId,
    domain: domain || undefined,
    hostUrl,
    mode,
    crossDomainDomains,
  };
  const code = getInstallSnippet(guide, installContext);

  const websiteUrl = domain ? `https://${domain}` : '(no domain configured)';
  const missingDirectives = [
    preflight?.csp.scriptBlocked ? 'script-src' : '',
    preflight?.csp.connectBlocked ? 'connect-src' : '',
  ].filter(Boolean);

  const diagnostic = useMemo(() => {
    const currentHeaders = preflight
      ? preflight.csp.currentHeaders.length > 0
        ? preflight.csp.currentHeaders.map(header => `  ${header}`)
        : ['  none']
      : ['  not checked'];
    const suggestedHeaders = preflight
      ? preflight.csp.suggestedHeaders.length > 0
        ? preflight.csp.suggestedHeaders.map(header => `  ${header}`)
        : ['  none']
      : ['  not checked'];

    return [
      `Website: ${websiteUrl}`,
      `Current install mode: ${mode}`,
      `Detected host: ${detectedHost.label} (${detectedHost.confidence})`,
      'Security policy headers:',
      ...currentHeaders,
      `Missing directives: ${missingDirectives.length > 0 ? missingDirectives.join(', ') : 'none'}`,
      `Advanced policy (strict-dynamic): ${preflight?.csp.strictDynamic ? 'yes' : 'no'}`,
      'Suggested security policy header:',
      ...suggestedHeaders,
    ].join('\n');
  }, [detectedHost.confidence, detectedHost.label, missingDirectives, mode, preflight, websiteUrl]);

  async function copy(key: string, value: string) {
    setCopyError(null);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is unavailable');
      }

      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey(current => (current === key ? null : current));
      }, 1600);
    } catch {
      setCopyError('Copy failed. Select the text and copy it manually.');
    }
  }

  function section(index: number, node: ReactNode) {
    return renderSection ? renderSection(index, node) : node;
  }

  function renderNotice() {
    if (mode === 'first-party') {
      return (
        <section className={styles.firstPartyCard} aria-labelledby="first-party-install-title">
          <p className={styles.eyebrow}>Recommended install</p>
          <h2 id="first-party-install-title" className={styles.cardTitle}>
            Your site blocks third-party scripts.
          </h2>
          <p className={styles.cardBody}>
            Use the first-party install. {BRAND.name} runs from your own domain, so your existing
            security policy already allows it.
          </p>
          <p className={styles.cardNote}>No security-policy changes.</p>
          <button
            type="button"
            className={styles.textAction}
            onClick={() => setManualMode('standard')}
          >
            Use the standard install instead
          </button>
        </section>
      );
    }

    if (loading && !preflight) {
      return null;
    }

    if (!preflight) {
      return (
        <p className={styles.note}>
          We couldn’t inspect your site. Install normally; if no events arrive, try the first-party
          install.
        </p>
      );
    }

    if (preflight.reason === 'no-domain') {
      return (
        <p className={styles.note}>
          Add the website domain so we can check which install your site needs.
        </p>
      );
    }

    if (
      preflight.reason === 'unreachable' ||
      preflight.reason === 'blocked-by-waf' ||
      preflight.reason === 'invalid-csp'
    ) {
      return (
        <p className={styles.note}>
          We couldn’t inspect your site. Install normally; if no events arrive, try the first-party
          install.
        </p>
      );
    }

    if (preflight.reason === 'local') {
      return (
        <p className={styles.note}>
          This website uses a local or private address. Use the standard install for local testing.
        </p>
      );
    }

    if (preflight.csp.strictDynamic) {
      return (
        <div className={styles.noteStack}>
          <p className={styles.note}>
            Your site uses an advanced security policy. Add {BRAND.name} to the allowed sources, or
            ask whoever manages your security headers for a nonce-based exception. The first-party
            install may still need a nonce.
          </p>
          {preflight.csp.suggestedHeaders.length > 0 && (
            <details className={styles.advanced}>
              <summary>View the suggested policy change</summary>
              <pre className={styles.advancedCode}>
                <code>{preflight.csp.suggestedHeaders.join('\n')}</code>
              </pre>
            </details>
          )}
        </div>
      );
    }

    if (manualMode === 'standard' && recommendedMode === 'first-party') {
      return (
        <div className={styles.noteStack}>
          <p className={styles.note}>
            Your site blocks third-party scripts. The standard install may not send events.
          </p>
          <button
            type="button"
            className={styles.textAction}
            onClick={() => setManualMode('first-party')}
          >
            Use the first-party install
          </button>
        </div>
      );
    }

    return <p className={styles.note}>No security-policy changes needed.</p>;
  }

  function renderCodeBlock({
    key,
    label,
    path,
    code: blockCode,
    language,
  }: {
    key: string;
    label: string;
    path: string;
    code: string;
    language: string;
  }) {
    const useTextField = variant === 'settings' && key === 'snippet';

    return (
      <section className={styles.codeSection} key={key} aria-label={label}>
        <div className={styles.codeHeader}>
          <div className={styles.codeHeading}>
            <span className={styles.codeLabel}>{label}</span>
            <span className={styles.codePath}>{path}</span>
          </div>
          <span className={styles.codeLanguage}>{language}</span>
        </div>

        {useTextField ? (
          <TextField
            key={blockCode}
            value={blockCode}
            isReadOnly
            allowCopy
            asTextArea
            resize="none"
            aria-label={label}
            className="code-textarea"
          />
        ) : (
          <pre className={styles.codeBlock}>
            <code>{blockCode}</code>
          </pre>
        )}

        <div className={styles.codeFooter}>
          <button
            type="button"
            className={styles.copyButton}
            onClick={() => void copy(key, blockCode)}
          >
            {copiedKey === key ? 'Copied' : `Copy ${label.toLowerCase()}`}
          </button>
          <span className={styles.copyFeedback} aria-live="polite">
            {copiedKey === key ? `${label} copied` : ''}
          </span>
        </div>
      </section>
    );
  }

  const installBlock = (
    <section className={styles.installBlock} aria-label="Install code">
      {preflight && <p className={styles.detected}>{detectedHostCopy(detectedHost)}</p>}

      <div className={styles.tabs} role="tablist" aria-label="Install target">
        {(mode === 'first-party' ? FIRST_PARTY_GUIDES : STANDARD_GUIDES).map(item => {
          const active = item.slug === guide.slug;
          const label = mode === 'first-party' ? hostTabLabel(item.title) : item.title;

          return (
            <button
              key={item.slug}
              type="button"
              role="tab"
              id={`install-tab-${item.slug}`}
              aria-selected={active}
              aria-controls="install-panel"
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              onClick={() => {
                if (mode === 'first-party') {
                  setFirstPartyGuideSlug(item.slug);
                } else {
                  setStandardGuideSlug(item.slug);
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div id="install-panel" role="tabpanel" aria-labelledby={`install-tab-${guide.slug}`}>
        {mode === 'first-party' &&
          guide.firstParty?.files.map(file =>
            renderCodeBlock({
              key: `file-${file.path}`,
              label: file.label,
              path: file.path,
              code: file.code,
              language: file.language,
            }),
          )}

        {renderCodeBlock({
          key: 'snippet',
          label: 'Snippet',
          path: mode === 'first-party' ? guide.firstParty?.snippetPath || 'Shared layout' : '',
          code,
          language: mode === 'first-party' ? 'html' : guide.language,
        })}

        {mode === 'first-party' && guide.firstParty && (
          <ul className={styles.guideNotes}>
            <li>{guide.firstParty.policyNote}</li>
            <li>{guide.firstParty.cookiesNote}</li>
          </ul>
        )}

        <Link className={styles.guideLink} href={`/docs/install#${guide.slug}`}>
          Open the {guide.title} guide
        </Link>
      </div>
    </section>
  );

  const toolsBlock = (
    <div className={styles.tools}>
      <div className={styles.toolActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void check()}
          aria-busy={loading}
        >
          {loading ? 'Checking…' : variant === 'settings' ? 'Re-check install' : 'Re-check'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void copy('diagnostic', diagnostic)}
        >
          {copiedKey === 'diagnostic' ? 'Diagnostic copied' : 'Copy diagnostic'}
        </button>
      </div>
      {loading && <p className={styles.checking}>Checking your site…</p>}
      {copyError && <p className={styles.error}>{copyError}</p>}
    </div>
  );

  function renderStatus() {
    if (!verify) {
      return null;
    }

    const firstPartyInstalled = preflight?.firstParty.installed === true;
    const recommendedFirstParty = preflight?.recommendedMode === 'first-party';
    const unreachable =
      preflight?.reason === 'unreachable' ||
      preflight?.reason === 'blocked-by-waf' ||
      preflight?.reason === 'invalid-csp';

    let title = 'Waiting for the first event';
    let detail =
      'Open your site once after deploying the script. This check refreshes every five seconds.';

    if (verify.installed) {
      title = 'Tracker connected';
      detail = `${verify.eventCount.toLocaleString('en-US')} event${
        verify.eventCount === 1 ? '' : 's'
      } received. Live verification reads the event store.`;
    } else if (firstPartyInstalled) {
      title = 'First-party install detected';
      detail = 'Open your site once to send the first event.';
    } else if (recommendedFirstParty) {
      title = 'Your site blocks third-party scripts.';
      detail = 'Use the first-party install above to start sending events.';
    } else if (unreachable) {
      detail = 'Waiting for the first event. If nothing arrives, check the first-party install.';
    }

    return (
      <section className={styles.statusCard} data-installed={verify.installed || false}>
        <span className={styles.statusDot} aria-hidden="true" />
        <div className={styles.statusCopy}>
          <p className={styles.statusTitle}>{title}</p>
          <p className={styles.statusDetail}>{detail}</p>
          {verifyError && <p className={styles.error}>{verifyError}</p>}
        </div>
        {onCheckVerify && (
          <button type="button" className={styles.statusAction} onClick={onCheckVerify}>
            Check now
          </button>
        )}
      </section>
    );
  }

  return (
    <div className={styles.root} data-variant={variant}>
      {section(0, renderNotice())}
      {section(1, installBlock)}
      {section(2, toolsBlock)}
      {verify && section(3, renderStatus())}
    </div>
  );
}
