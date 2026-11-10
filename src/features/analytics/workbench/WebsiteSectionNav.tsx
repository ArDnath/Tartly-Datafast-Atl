'use client';

import { Button, Icon, Menu, MenuItem, MenuTrigger, Popover, Row, Text } from '@talivia/react-zen';
import { IconLabel } from '@/components/common/IconLabel';
import Link from '@/components/common/Link';
import { useNavigation } from '@/components/hooks';
import {
  AlignHorizontalSpacing as AlignEndHorizontal,
  Clock,
  Eye,
  FilterList as Funnel,
  DashboardSpeed as Gauge,
  Community as Layers,
  Flash as Lightning,
  Magnet,
  MoneySquare as Money,
  NavArrowDown,
  Network,
  PathArrow as Path,
  Play as PlayCircle,
  SettingsProfiles as Settings2,
  Table as Sheet,
  Activity as Stethoscope,
  Label as Tag,
  Trophy as Target,
  User,
} from '@/components/icons';

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

/**
 * The daily working set. Everything else lives one click away in the More
 * menu, so the dashboard never opens with a nineteen-item wall of links.
 */
const PRIMARY_ITEMS = ['overview', 'revenue', 'sessions', 'events', 'funnels', 'replays'];

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
  const sections = getWebsiteNavSections(websiteId);
  const items = sections.flatMap(section => section.items);

  return {
    active: getActiveSection(pathname, websiteId),
    items,
    primary: PRIMARY_ITEMS.map(id => items.find(item => item.id === id)).filter(
      (item): item is NavItem => Boolean(item),
    ),
    more: items.filter(item => !PRIMARY_ITEMS.includes(item.id)),
  };
}

/**
 * A single restrained row of destinations. It replaces the old left rail: the
 * chart and the money should be the first thing on the screen, not navigation.
 */
export function WebsiteSectionNav({ websiteId }: { websiteId: string }) {
  const { active, primary, more } = useActiveNav(websiteId);
  const activeMoreItem = more.find(item => item.id === active);

  return (
    <Row as="nav" aria-label="Website sections" className="website-nav" alignItems="center" gap="1">
      {primary.map(item => (
        <Link
          key={item.id}
          href={item.path}
          className="website-nav-link"
          data-selected={item.id === active ? '' : undefined}
          aria-current={item.id === active ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}

      <MenuTrigger>
        <Button
          className="website-nav-link website-nav-more"
          variant="quiet"
          data-selected={activeMoreItem ? '' : undefined}
          aria-label={
            activeMoreItem ? `More reports, ${activeMoreItem.label} active` : 'More reports'
          }
        >
          <Row alignItems="center" gap="1">
            <Text>{activeMoreItem?.label || 'More'}</Text>
            <Icon size="sm">
              <NavArrowDown />
            </Icon>
          </Row>
        </Button>
        <Popover className="talivia-popover website-nav-menu" placement="bottom start">
          <Menu>
            {more.map(item => (
              <MenuItem
                key={item.id}
                id={item.id}
                href={item.path}
                data-selected={item.id === active ? '' : undefined}
              >
                <IconLabel icon={item.icon} label={item.label} />
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </Row>
  );
}

/** Kept as the small-screen alias so existing mounts keep one contract. */
export function WebsiteSectionTabs({ websiteId }: { websiteId: string }) {
  return <WebsiteSectionNav websiteId={websiteId} />;
}
