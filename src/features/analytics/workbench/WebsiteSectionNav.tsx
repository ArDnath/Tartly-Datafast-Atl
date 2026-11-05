'use client';

import { Column, Row, Text } from '@talivia/react-zen';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { useNavigation } from '@/components/hooks';
import {
  AlignEndHorizontal,
  Clock,
  Eye,
  Gauge,
  Layers,
  PlayCircle,
  Settings2,
  Sheet,
  Stethoscope,
  User,
} from '@/components/icons';
import { Funnel, Lightning, Magnet, Money, Network, Path, Tag, Target } from '@/components/svg';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const LEGACY_ROUTES: Record<string, string> = {
  'revenue-attribution': 'attribution',
  'revenue-journey': 'journeys',
  'revenue-diagnostics': 'diagnostics',
};

function getActiveSection(pathname: string, websiteId: string) {
  const base = `/app/${websiteId}`;

  if (!pathname.startsWith(base)) {
    return 'overview';
  }

  const segment = pathname.slice(base.length).replace(/^\/+/, '').split('/')[0];

  if (!segment) {
    return 'overview';
  }

  return LEGACY_ROUTES[segment] || segment;
}

/**
 * The website workbench is grouped by job rather than by feature list:
 * revenue first, then the audience and behaviour that produced it, then the
 * growth surfaces. Keeping the grouping in one component means a new report is
 * reachable the moment its route exists.
 */
export function getWebsiteNavSections(websiteId: string): NavSection[] {
  const path = (route: string) => (route ? `/app/${websiteId}/${route}` : `/app/${websiteId}`);

  return [
    {
      label: 'Revenue',
      items: [
        { id: 'overview', label: 'Overview', path: path(''), icon: <Eye /> },
        { id: 'revenue', label: 'Revenue', path: path('revenue'), icon: <Money /> },
        {
          id: 'attribution',
          label: 'Attribution',
          path: path('attribution'),
          icon: <Network />,
        },
        {
          id: 'journeys',
          label: 'Customer journeys',
          path: path('journeys'),
          icon: <Path />,
        },
        {
          id: 'diagnostics',
          label: 'Diagnostics',
          path: path('diagnostics'),
          icon: <Stethoscope />,
        },
      ],
    },
    {
      label: 'Audience',
      items: [
        { id: 'sessions', label: 'Visitors', path: path('sessions'), icon: <User /> },
        { id: 'events', label: 'Events', path: path('events'), icon: <Lightning /> },
        { id: 'realtime', label: 'Realtime', path: path('realtime'), icon: <Clock /> },
        { id: 'breakdown', label: 'Breakdown', path: path('breakdown'), icon: <Sheet /> },
      ],
    },
    {
      label: 'Behaviour',
      items: [
        { id: 'goals', label: 'Goals', path: path('goals'), icon: <Target /> },
        { id: 'funnels', label: 'Funnels', path: path('funnels'), icon: <Funnel /> },
        { id: 'retention', label: 'Retention', path: path('retention'), icon: <Magnet /> },
        { id: 'cohorts', label: 'Cohorts', path: path('cohorts'), icon: <Layers /> },
      ],
    },
    {
      label: 'Growth',
      items: [
        { id: 'utm', label: 'UTM', path: path('utm'), icon: <Tag /> },
        {
          id: 'performance',
          label: 'Performance',
          path: path('performance'),
          icon: <Gauge />,
        },
        {
          id: 'compare',
          label: 'Compare',
          path: path('compare'),
          icon: <AlignEndHorizontal />,
        },
      ],
    },
    {
      label: 'Replay',
      items: [
        { id: 'replays', label: 'Session replay', path: path('replays'), icon: <PlayCircle /> },
      ],
    },
    {
      label: 'Settings',
      items: [
        {
          id: 'settings',
          label: 'Website settings',
          path: path('settings'),
          icon: <Settings2 />,
        },
      ],
    },
  ];
}

function useActiveNav(websiteId: string) {
  const { pathname } = useNavigation();

  return {
    active: getActiveSection(pathname, websiteId),
    sections: getWebsiteNavSections(websiteId),
  };
}

export function WebsiteSectionNav({ websiteId }: { websiteId: string }) {
  const { active, sections } = useActiveNav(websiteId);

  return (
    <Column as="nav" aria-label="Website sections" className="website-section-nav" gap="5">
      {sections.map(section => (
        <Column key={section.label} gap="1">
          <Text className="website-section-nav-label">{section.label}</Text>
          {section.items.map(item => {
            const isActive = item.id === active;

            return (
              <Link
                key={item.id}
                href={item.path}
                className="website-section-nav-link"
                data-selected={isActive ? '' : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <IconLabel icon={item.icon} label={item.label} />
              </Link>
            );
          })}
        </Column>
      ))}
    </Column>
  );
}

export function WebsiteSectionTabs({ websiteId }: { websiteId: string }) {
  const { active, sections } = useActiveNav(websiteId);

  return (
    <Row
      as="nav"
      aria-label="Website sections"
      className="website-section-tabs"
      gap="1"
      overflowX="auto"
    >
      {sections
        .flatMap(section => section.items)
        .map(item => {
          const isActive = item.id === active;

          return (
            <Link
              key={item.id}
              href={item.path}
              className="website-section-tab"
              data-selected={isActive ? '' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
    </Row>
  );
}
