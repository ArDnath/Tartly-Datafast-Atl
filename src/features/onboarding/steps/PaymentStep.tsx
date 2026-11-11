'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/components/hooks';
import { PaymentProviderLogo } from '@/features/payments/components/PaymentProviderLogo';
import { BRAND } from '@/lib/brand';
import { Reveal, Spinner, StepHeading } from '../components/OnboardingControls';
import styles from '../Onboarding.module.css';

type ProviderId = 'stripe' | 'dodo' | 'lemonsqueezy' | 'polar' | 'yolfi';

interface ProviderDefinition {
  id: ProviderId;
  label: string;
  blurb: string;
  keyLabel: string;
  keyPlaceholder: string;
  helpHref: string;
  helpLabel: string;
  docsHref: string;
  needsStoreId?: boolean;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    blurb: 'Checkout, Payment Links, and Billing',
    keyLabel: 'Stripe restricted key',
    keyPlaceholder: 'rk_live_…',
    helpHref: `https://dashboard.stripe.com/apikeys/create?name=${encodeURIComponent(BRAND.name)}`,
    helpLabel: 'Create a restricted key',
    docsHref: '/docs/revenue-guides/stripe',
  },
  {
    id: 'dodo',
    label: 'Dodo Payments',
    blurb: 'Payments, refunds, and subscriptions',
    keyLabel: 'Dodo API key',
    keyPlaceholder: 'Paste your Dodo API key',
    helpHref: 'https://app.dodopayments.com/developer/api-keys',
    helpLabel: 'Create a Dodo API key',
    docsHref: '/docs/revenue-guides/dodo-payments',
  },
  {
    id: 'lemonsqueezy',
    label: 'Lemon Squeezy',
    blurb: 'Orders, subscriptions, and refunds',
    keyLabel: 'Lemon Squeezy API key',
    keyPlaceholder: 'Paste your API key',
    helpHref: 'https://app.lemonsqueezy.com/settings/api',
    helpLabel: 'Create an API key',
    docsHref: '/docs/revenue-guides/lemonsqueezy',
    needsStoreId: true,
  },
  {
    id: 'polar',
    label: 'Polar',
    blurb: 'Orders, subscriptions, and refunds',
    keyLabel: 'Polar access token',
    keyPlaceholder: 'Paste your organization access token',
    helpHref: 'https://polar.sh/dashboard',
    helpLabel: 'Open Polar',
    docsHref: '/docs/revenue-guides/polar',
  },
  {
    id: 'yolfi',
    label: 'Yolfi',
    blurb: 'Payments and subscriptions',
    keyLabel: 'Yolfi API key',
    keyPlaceholder: 'Paste your Yolfi API key',
    helpHref: 'https://app.yolfi.com',
    helpLabel: 'Open Yolfi',
    docsHref: '/docs/revenue-guides/yolfi',
  },
];

export function PaymentStep({
  websiteId,
  connectedProviders,
  busy,
  error,
  onFinish,
  onBack,
  onConnected,
}: {
  websiteId: string;
  connectedProviders: string[];
  busy: boolean;
  error: string | null;
  onFinish: () => void;
  onBack: () => void;
  onConnected?: (providerName: string) => void;
}) {
  const { post: apiPost } = useApi();
  const [selected, setSelected] = useState<ProviderId>('stripe');
  const [apiKey, setApiKey] = useState('');
  const [storeId, setStoreId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connected, setConnected] = useState(() => new Set(connectedProviders));

  const provider = PROVIDERS.find(item => item.id === selected) || PROVIDERS[0];
  const isConnected = connected.has(provider.id);

  async function handleConnect() {
    setConnectError(null);

    if (!apiKey.trim()) {
      setConnectError(`Paste your ${provider.label} key to connect.`);
      return;
    }

    if (provider.needsStoreId && !storeId.trim()) {
      setConnectError('Paste the Lemon Squeezy store ID as well.');
      return;
    }

    setConnecting(true);

    try {
      await apiPost(`/websites/${websiteId}/payment-provider-connections`, {
        providerName: provider.id,
        apiKey: apiKey.trim(),
        ...(provider.needsStoreId ? { providerAccountId: storeId.trim() } : {}),
      });

      setConnected(current => new Set(current).add(provider.id));
      onConnected?.(provider.id);
      setApiKey('');
      setStoreId('');
    } catch (cause) {
      setConnectError(
        cause instanceof Error ? cause.message : `Could not connect ${provider.label}.`,
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <StepHeading
        title="Connect revenue"
        subtitle={`Connect the payment provider that already handles your revenue. ${BRAND.name} reads payments and matches them to the traffic that created them.`}
      />

      <div className={styles.form}>
        <Reveal index={1} className={styles.providerGrid}>
          {PROVIDERS.map(item => {
            const itemConnected = connected.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.providerCard} ${selected === item.id ? styles.providerCardActive : ''}`}
                aria-pressed={selected === item.id}
                onClick={() => {
                  setSelected(item.id);
                  setConnectError(null);
                  setApiKey('');
                  setStoreId('');
                }}
              >
                <PaymentProviderLogo providerName={item.id} />
                <span className={styles.providerName}>{item.label}</span>
                <span className={styles.providerBlurb}>
                  {itemConnected ? 'Connected' : item.blurb}
                </span>
                {itemConnected && <span className={styles.providerCheck} aria-hidden="true" />}
              </button>
            );
          })}
        </Reveal>

        <Reveal index={2} className={styles.providerPanel}>
          <div className={styles.providerPanelHeading}>
            <div>
              <p className={styles.label}>{provider.label}</p>
              <p className={styles.hint}>{provider.blurb}</p>
            </div>
            <Link className={styles.link} href={provider.docsHref}>
              Read the guide
            </Link>
          </div>

          {isConnected ? (
            <div className={styles.statusCard} data-installed="true">
              <span className={styles.statusDot} aria-hidden="true" />
              <div className={styles.statusCopy}>
                <p className={styles.statusTitle}>{provider.label} connected</p>
                <p className={styles.statusDetail}>
                  {BRAND.name} is reading payments and matching them to visits. You can add another
                  provider or finish setup.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.fieldStack}>
              {provider.needsStoreId && (
                <div>
                  <label className={styles.label} htmlFor="lemonsqueezy-store">
                    Store ID
                  </label>
                  <input
                    id="lemonsqueezy-store"
                    className={styles.input}
                    value={storeId}
                    placeholder="Your Lemon Squeezy store ID"
                    autoComplete="off"
                    onChange={event => setStoreId(event.target.value)}
                  />
                </div>
              )}

              <div>
                <label className={styles.label} htmlFor="provider-api-key">
                  {provider.keyLabel}
                </label>
                <input
                  id="provider-api-key"
                  className={styles.input}
                  type="password"
                  value={apiKey}
                  placeholder={provider.keyPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={event => setApiKey(event.target.value)}
                />
                <p className={styles.hint}>
                  Stored encrypted on the server. Never returned by the API.{' '}
                  <a
                    className={styles.link}
                    href={provider.helpHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {provider.helpLabel}
                  </a>
                  .
                </p>
              </div>

              {connectError && <p className={styles.error}>{connectError}</p>}

              <button
                type="button"
                className={styles.primary}
                disabled={connecting}
                onClick={() => void handleConnect()}
              >
                {connecting && <Spinner />}
                Connect {provider.label}
              </button>
            </div>
          )}
        </Reveal>

        {error && <p className={styles.error}>{error}</p>}

        <Reveal index={3} className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onBack}>
            Back
          </button>
          <button type="button" className={styles.primary} disabled={busy} onClick={onFinish}>
            {busy && <Spinner />}
            Finish setup
          </button>
        </Reveal>

        <Reveal index={4}>
          <p className={styles.inlineNote}>
            This connects your customers’ payments. It is an analytics integration and never charges
            your {BRAND.name} subscription. You can connect another provider later in Settings →
            Integrations.
          </p>
        </Reveal>
      </div>
    </>
  );
}
