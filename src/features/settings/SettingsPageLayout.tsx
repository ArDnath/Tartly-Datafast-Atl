'use client';
import { Column, Grid, Heading, Row, Text } from '@talivia/react-zen';
import type { CSSProperties, ReactNode } from 'react';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { Panel } from '@/components/common/Panel';
import { useMessages, useNavigation } from '@/components/hooks';
import {
  ArrowLeft,
  CreditCard,
  Gauge,
  Globe2,
  Lock,
  Network,
  Settings2,
  UserRound,
  Users,
} from '@/components/icons';
import { APP_LAYOUT_MAX_WIDTH } from '@/lib/constants';

const SETTINGS_SURFACE_STYLE: CSSProperties = {
  borderRadius: 20,
  borderColor: '#ffffff12',
  background: '#161616',
};

type SettingsKey =
  | 'overview'
  | 'preferences'
  | 'account'
  | 'workspace'
  | 'websites'
  | 'integrations'
  | 'billing'
  | 'security';

export function SettingsPageLayout({
  activeKey,
  subtitle,
  children,
}: {
  activeKey: SettingsKey;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  const { t, labels } = useMessages();
  const { renderUrl } = useNavigation();
  const items = [
    {
      id: 'overview' as const,
      label: 'Overview',
      path: renderUrl('/app/settings', false),
      icon: <Gauge />,
    },
    {
      id: 'workspace' as const,
      label: 'Workspace',
      path: renderUrl('/app/settings/workspace', false),
      icon: <Users />,
    },
    {
      id: 'websites' as const,
      label: 'Websites',
      path: renderUrl('/app/settings/websites', false),
      icon: <Globe2 />,
    },
    {
      id: 'integrations' as const,
      label: 'Integrations',
      path: renderUrl('/app/settings/integrations', false),
      icon: <Network />,
    },
    {
      id: 'billing' as const,
      label: 'Plan and usage',
      path: renderUrl('/app/settings/billing', false),
      icon: <CreditCard />,
    },
    {
      id: 'security' as const,
      label: 'Security',
      path: renderUrl('/app/settings/security', false),
      icon: <Lock />,
    },
    {
      id: 'account' as const,
      label: 'Account',
      path: renderUrl('/app/settings/account', false),
      icon: <UserRound />,
    },
    {
      id: 'preferences' as const,
      label: t(labels.preferences),
      path: renderUrl('/app/settings/preferences', false),
      icon: <Settings2 />,
    },
  ];

  return (
    <Column width="100%" maxWidth={APP_LAYOUT_MAX_WIDTH} style={{ marginInline: 'auto' }}>
      <Column gap="3" paddingY="3" marginBottom="3">
        <Row>
          <Link href={renderUrl('/app', false)}>
            <IconLabel icon={<ArrowLeft />} label={t(labels.back)} />
          </Link>
        </Row>
        <Column gap="1" minWidth="0">
          <Heading size={{ base: 'lg', md: '2xl' }}>{t(labels.settings)}</Heading>
          <Text color="muted">{subtitle}</Text>
        </Column>
      </Column>

      <Grid columns={{ base: '1fr', lg: '240px minmax(0, 1fr)' }} gap="6" alignItems="start">
        <nav aria-label="Application settings">
          <Column border borderRadius padding="3" gap="1" style={SETTINGS_SURFACE_STYLE}>
            <Row paddingX="2" paddingY="2">
              <Text weight="bold">{t(labels.settings)}</Text>
            </Row>
            {items.map(item => {
              const isSelected = item.id === activeKey;

              return (
                <Link key={item.id} href={item.path}>
                  <Row
                    alignItems="center"
                    minHeight="44px"
                    borderRadius
                    paddingX="2"
                    style={
                      isSelected
                        ? {
                            background: 'rgba(242, 180, 203, 0.12)',
                            border: '1px solid rgba(242, 180, 203, 0.34)',
                          }
                        : undefined
                    }
                  >
                    <IconLabel
                      icon={item.icon}
                      label={item.label}
                      weight={isSelected ? 'bold' : undefined}
                    />
                  </Row>
                </Link>
              );
            })}
          </Column>
        </nav>

        <Panel style={SETTINGS_SURFACE_STYLE}>{children}</Panel>
      </Grid>
    </Column>
  );
}
