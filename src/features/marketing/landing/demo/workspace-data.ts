import { BRAND } from '@/lib/brand';

/**
 * Deterministic sample data for the interactive hero workspace.
 *
 * This module is presentation-only: no request, database, or analytics code
 * reads it. Every number is generated from a fixed seed so the marketing page
 * renders identically on the server and the client, and the frame is always
 * labelled as an illustrative preview.
 */

export type ViewId =
  | 'overview'
  | 'revenue'
  | 'visitors'
  | 'events'
  | 'funnels'
  | 'replays'
  | 'journeys'
  | 'goals'
  | 'utm'
  | 'retention';

export type RangeKey = '24h' | '7d' | '30d' | '90d';
export type Granularity = 'Hour' | 'Day' | 'Week';

export type KpiFormat = 'currency' | 'number' | 'percent' | 'duration' | 'text';

export type Kpi = {
  label: string;
  value: number;
  format: KpiFormat;
  delta?: string;
  tone?: 'up' | 'down';
  /** Ratio metrics such as conversion do not shrink when a row filters the view. */
  scale?: boolean;
  live?: boolean;
  suffix?: string;
};

export type Row = {
  label: string;
  value: number;
  /** Preformatted display value when the row is not a visitor count. */
  display?: string;
  conv?: number;
  flag?: string;
};

export type BreakdownTab = {
  id: string;
  label: string;
  unit: 'visitors' | 'revenue' | 'events';
  rows: Row[];
};

export type BreakdownCard = {
  id: string;
  tabs: BreakdownTab[];
};

export type TableTab = {
  id: string;
  label: string;
  columns: string[];
  rows: (string | number)[][];
};

export type FunnelStep = { label: string; value: number };
export type FunnelTab = { id: string; label: string; steps: FunnelStep[] };

export type ReplayRow = {
  id: string;
  visitor: string;
  country: string;
  flag: string;
  browser: string;
  os: string;
  device: string;
  duration: string;
  pages: number;
  activity: string;
  issues?: string;
};

export type Cohort = { label: string; visitors: string; values: number[] };

export type ViewConfig = {
  kpis: Kpi[];
  chart?: {
    title: string;
    legend: string;
    metric: 'visitors' | 'revenue' | 'events';
    total: number;
    format: KpiFormat;
  };
  breakdowns?: BreakdownCard[];
  table?: { tabs: TableTab[] };
  funnels?: FunnelTab[];
  replays?: ReplayRow[];
  retention?: { headings: string[]; cohorts: Cohort[] };
};

export type DemoFilter = {
  label: string;
  factor: number;
  conv?: number;
};

export const MAIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'events', label: 'Events' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'replays', label: 'Session replay' },
] as const;

export const MORE_TABS = [
  { id: 'journeys', label: 'Journeys' },
  { id: 'goals', label: 'Goals' },
  { id: 'utm', label: 'UTM' },
  { id: 'retention', label: 'Retention' },
] as const;

export const RANGE_OPTIONS: {
  value: RangeKey;
  label: string;
  factor: number;
  points: number;
  axis: string[];
}[] = [
  {
    value: '24h',
    label: 'Last 24 hours',
    factor: 0.09,
    points: 24,
    axis: ['8 PM', '12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'],
  },
  {
    value: '7d',
    label: 'Last 7 days',
    factor: 0.3,
    points: 7,
    axis: ['Nov 4', 'Nov 5', 'Nov 6', 'Nov 7', 'Nov 8', 'Nov 9', 'Nov 10'],
  },
  {
    value: '30d',
    label: 'Last 30 days',
    factor: 1,
    points: 30,
    axis: ['Oct 12', 'Oct 19', 'Oct 26', 'Nov 2', 'Nov 10'],
  },
  {
    value: '90d',
    label: 'Last 90 days',
    factor: 2.7,
    points: 13,
    axis: ['Aug 12', 'Sep 1', 'Sep 20', 'Oct 10', 'Nov 10'],
  },
];

export const GRANULARITY_OPTIONS: Granularity[] = ['Hour', 'Day', 'Week'];

const acquisition: BreakdownCard = {
  id: 'acquisition',
  tabs: [
    {
      id: 'referrers',
      label: 'Referrers',
      unit: 'visitors',
      rows: [
        { label: 'google.com', value: 3240, conv: 2.8 },
        { label: 'linkedin.com', value: 2860, conv: 3.4 },
        { label: 'producthunt.com', value: 2120, conv: 2.9 },
        { label: 'x.com', value: 1640, conv: 1.8 },
        { label: 'reddit.com', value: 1210, conv: 1.4 },
        { label: 'news.ycombinator.com', value: 890, conv: 2.1 },
        { label: 'youtube.com', value: 620, conv: 1.1 },
        { label: 'github.com', value: 360, conv: 3.8 },
      ],
    },
    {
      id: 'channels',
      label: 'Channels',
      unit: 'visitors',
      rows: [
        { label: 'Product Hunt', value: 3120, conv: 2.9 },
        { label: 'Google', value: 2480, conv: 2.1 },
        { label: 'Direct', value: 2410, conv: 1.4 },
        { label: 'X / Twitter', value: 1860, conv: 1.8 },
        { label: 'Newsletter', value: 1340, conv: 4.6 },
        { label: 'Reddit', value: 890, conv: 1.3 },
        { label: 'YouTube', value: 620, conv: 1.1 },
        { label: 'LinkedIn', value: 220, conv: 3.2 },
      ],
    },
    {
      id: 'campaigns',
      label: 'Campaign',
      unit: 'visitors',
      rows: [
        { label: 'launch-week', value: 2940, conv: 3.1 },
        { label: 'newsletter-oct', value: 2310, conv: 4.8 },
        { label: 'founder-story', value: 1680, conv: 2.6 },
        { label: 'retargeting', value: 1220, conv: 1.9 },
        { label: 'product-hunt', value: 980, conv: 2.9 },
        { label: '(direct) / (none)', value: 3810, conv: 1.4 },
      ],
    },
    {
      id: 'keywords',
      label: 'Keywords',
      unit: 'visitors',
      rows: [
        { label: 'revenue attribution', value: 840, conv: 3.8 },
        { label: 'analytics for saas', value: 620, conv: 2.4 },
        { label: 'stripe revenue analytics', value: 480, conv: 4.1 },
        { label: 'open source analytics', value: 360, conv: 2.2 },
        { label: 'first touch attribution', value: 310, conv: 3.3 },
        { label: 'tartly', value: 280, conv: 6.2 },
      ],
    },
  ],
};

const geography: BreakdownCard = {
  id: 'geography',
  tabs: [
    {
      id: 'countries',
      label: 'Countries',
      unit: 'visitors',
      rows: [
        { label: 'United States', value: 3410, conv: 2.8, flag: '🇺🇸' },
        { label: 'India', value: 2120, conv: 2.1, flag: '🇮🇳' },
        { label: 'United Kingdom', value: 1640, conv: 3.1, flag: '🇬🇧' },
        { label: 'Germany', value: 1280, conv: 2.4, flag: '🇩🇪' },
        { label: 'Canada', value: 980, conv: 2.9, flag: '🇨🇦' },
        { label: 'Brazil', value: 860, conv: 1.8, flag: '🇧🇷' },
        { label: 'Singapore', value: 620, conv: 3.6, flag: '🇸🇬' },
        { label: 'Australia', value: 540, conv: 2.7, flag: '🇦🇺' },
      ],
    },
    {
      id: 'regions',
      label: 'Regions',
      unit: 'visitors',
      rows: [
        { label: 'California', value: 1120, conv: 3.2 },
        { label: 'England', value: 940, conv: 3.1 },
        { label: 'Karnataka', value: 820, conv: 2.4 },
        { label: 'Berlin', value: 710, conv: 2.5 },
        { label: 'Ontario', value: 560, conv: 2.9 },
        { label: 'São Paulo', value: 480, conv: 1.8 },
        { label: 'New South Wales', value: 360, conv: 2.6 },
      ],
    },
    {
      id: 'cities',
      label: 'Cities',
      unit: 'visitors',
      rows: [
        { label: 'San Francisco', value: 640, conv: 3.4 },
        { label: 'London', value: 590, conv: 3.2 },
        { label: 'Berlin', value: 470, conv: 2.5 },
        { label: 'Bengaluru', value: 430, conv: 2.3 },
        { label: 'Toronto', value: 360, conv: 2.9 },
        { label: 'Singapore', value: 310, conv: 3.6 },
        { label: 'São Paulo', value: 260, conv: 1.7 },
      ],
    },
  ],
};

const pages: BreakdownCard = {
  id: 'pages',
  tabs: [
    {
      id: 'page',
      label: 'Page',
      unit: 'visitors',
      rows: [
        { label: '/', value: 4280, conv: 1.9 },
        { label: '/pricing', value: 3140, conv: 4.8 },
        { label: '/blog/revenue-attribution', value: 2120, conv: 2.6 },
        { label: '/features/attribution', value: 1640, conv: 2.2 },
        { label: '/docs/install', value: 1210, conv: 3.1 },
        { label: '/signup', value: 980, conv: 12.4 },
        { label: '/alternatives/datafast', value: 560, conv: 2.8 },
        { label: '/changelog', value: 420, conv: 1.6 },
      ],
    },
    {
      id: 'hostname',
      label: 'Hostname',
      unit: 'visitors',
      rows: [
        { label: 'tartly.in', value: 7820, conv: 2.3 },
        { label: 'app.tartly.in', value: 2940, conv: 4.1 },
        { label: 'docs.tartly.in', value: 1410, conv: 3.2 },
        { label: 'blog.tartly.in', value: 770, conv: 2.7 },
      ],
    },
    {
      id: 'entry',
      label: 'Entry page',
      unit: 'visitors',
      rows: [
        { label: '/', value: 5120, conv: 1.9 },
        { label: '/blog/revenue-attribution', value: 1860, conv: 2.6 },
        { label: '/pricing', value: 1540, conv: 4.8 },
        { label: '/features/attribution', value: 1120, conv: 2.2 },
        { label: '/docs/install', value: 860, conv: 3.1 },
        { label: '/alternatives/datafast', value: 480, conv: 2.8 },
      ],
    },
  ],
};

const technology: BreakdownCard = {
  id: 'technology',
  tabs: [
    {
      id: 'browsers',
      label: 'Browsers',
      unit: 'visitors',
      rows: [
        { label: 'Chrome', value: 5840, conv: 2.6 },
        { label: 'Safari', value: 3120, conv: 2.1 },
        { label: 'Edge', value: 1640, conv: 2.4 },
        { label: 'Firefox', value: 1180, conv: 2.9 },
        { label: 'Arc', value: 620, conv: 3.4 },
        { label: 'Brave', value: 320, conv: 3.1 },
      ],
    },
    {
      id: 'os',
      label: 'OS',
      unit: 'visitors',
      rows: [
        { label: 'macOS', value: 4620, conv: 3.1 },
        { label: 'Windows', value: 3720, conv: 2.2 },
        { label: 'iOS', value: 2180, conv: 2.4 },
        { label: 'Android', value: 1640, conv: 1.8 },
        { label: 'Linux', value: 780, conv: 3.6 },
      ],
    },
    {
      id: 'devices',
      label: 'Devices',
      unit: 'visitors',
      rows: [
        { label: 'Desktop', value: 8240, conv: 2.9 },
        { label: 'Mobile', value: 4020, conv: 1.8 },
        { label: 'Tablet', value: 680, conv: 1.6 },
      ],
    },
  ],
};

const revenueBreakdown: BreakdownCard = {
  id: 'revenue-source',
  tabs: [
    {
      id: 'channel',
      label: 'Channel',
      unit: 'revenue',
      rows: [
        { label: 'Product Hunt', value: 1940, display: '$1,940', conv: 2.9 },
        { label: 'Newsletter', value: 790, display: '$790', conv: 4.6 },
        { label: 'Google', value: 1210, display: '$1,210', conv: 2.1 },
        { label: 'Direct', value: 790, display: '$790', conv: 1.4 },
        { label: 'X / Twitter', value: 590, display: '$590', conv: 1.8 },
        { label: 'LinkedIn', value: 330, display: '$330', conv: 3.2 },
        { label: 'Reddit', value: 170, display: '$170', conv: 1.3 },
      ],
    },
    {
      id: 'campaign',
      label: 'Campaign',
      unit: 'revenue',
      rows: [
        { label: 'launch-week', value: 2250, display: '$2,250', conv: 3.1 },
        { label: 'newsletter-oct', value: 1080, display: '$1,080', conv: 4.8 },
        { label: 'product-hunt', value: 760, display: '$760', conv: 2.9 },
        { label: 'founder-story', value: 410, display: '$410', conv: 2.6 },
        { label: 'retargeting', value: 260, display: '$260', conv: 1.9 },
        { label: '(direct) / (none)', value: 60, display: '$60', conv: 1.4 },
      ],
    },
    {
      id: 'referrer',
      label: 'Referrer',
      unit: 'revenue',
      rows: [
        { label: 'google.com', value: 1210, display: '$1,210', conv: 2.8 },
        { label: 'linkedin.com', value: 1120, display: '$1,120', conv: 3.4 },
        { label: 'producthunt.com', value: 1010, display: '$1,010', conv: 2.9 },
        { label: 'x.com', value: 480, display: '$480', conv: 1.8 },
        { label: 'reddit.com', value: 310, display: '$310', conv: 1.4 },
        { label: 'news.ycombinator.com', value: 690, display: '$690', conv: 2.1 },
      ],
    },
  ],
};

const revenuePlans: BreakdownCard = {
  id: 'revenue-plan',
  tabs: [
    {
      id: 'plan',
      label: 'Plan',
      unit: 'revenue',
      rows: [
        { label: 'Pro · monthly', value: 2410, display: '$2,410', conv: 1.8 },
        { label: 'Pro · annual', value: 1180, display: '$1,180', conv: 1.2 },
        { label: 'Starter · monthly', value: 860, display: '$860', conv: 2.1 },
        { label: 'Starter · annual', value: 370, display: '$370', conv: 1.4 },
      ],
    },
    {
      id: 'product',
      label: 'Product',
      unit: 'revenue',
      rows: [
        { label: `${BRAND.name} Pro`, value: 3590, display: '$3,590', conv: 1.6 },
        { label: `${BRAND.name} Starter`, value: 980, display: '$980', conv: 2.0 },
        { label: 'Onboarding audit', value: 250, display: '$250', conv: 4.2 },
      ],
    },
    {
      id: 'coupon',
      label: 'Coupon',
      unit: 'revenue',
      rows: [
        { label: 'LAUNCH20', value: 640, display: '$640', conv: 3.8 },
        { label: 'FOUNDER25', value: 420, display: '$420', conv: 3.1 },
        { label: 'No coupon', value: 3760, display: '$3,760', conv: 1.7 },
      ],
    },
  ],
};

const eventBreakdown: BreakdownCard = {
  id: 'event-types',
  tabs: [
    {
      id: 'event',
      label: 'Event',
      unit: 'events',
      rows: [
        { label: 'pageview', value: 61240 },
        { label: 'session_start', value: 15620 },
        { label: 'signup_completed', value: 2410 },
        { label: 'checkout_started', value: 1120 },
        { label: 'payment_succeeded', value: 178 },
        { label: 'provider_connected', value: 96 },
        { label: 'replay_started', value: 64 },
      ],
    },
    {
      id: 'type',
      label: 'Type',
      unit: 'events',
      rows: [
        { label: 'Page view', value: 61240 },
        { label: 'Custom', value: 18640 },
        { label: 'Session', value: 3820 },
        { label: 'Payment', value: 480 },
        { label: 'Error', value: 140 },
      ],
    },
    {
      id: 'source',
      label: 'Source',
      unit: 'events',
      rows: [
        { label: 'Tracker', value: 74210 },
        { label: 'Stripe webhook', value: 4820 },
        { label: 'Dodo webhook', value: 3120 },
        { label: 'Manual API', value: 2170 },
      ],
    },
  ],
};

const journeyBreakdowns: BreakdownCard[] = [
  {
    id: 'journey-paths',
    tabs: [
      {
        id: 'paths',
        label: 'Top paths',
        unit: 'visitors',
        rows: [
          { label: 'Google → / → /pricing → Signup', value: 1840, conv: 4.8 },
          { label: 'Product Hunt → / → Signup', value: 1620, conv: 3.6 },
          { label: 'LinkedIn → /blog → /pricing', value: 1210, conv: 2.9 },
          { label: 'Newsletter → /features → Signup', value: 980, conv: 5.2 },
          { label: 'Direct → / → /docs → Signup', value: 740, conv: 3.1 },
          { label: 'X → /pricing → Checkout', value: 620, conv: 1.8 },
        ],
      },
    ],
  },
  {
    id: 'journey-timing',
    tabs: [
      {
        id: 'timing',
        label: 'Time to convert',
        unit: 'visitors',
        rows: [
          { label: 'Same session', value: 2680, conv: 3.9 },
          { label: '1–3 days', value: 2140, conv: 3.2 },
          { label: '4–7 days', value: 1460, conv: 2.7 },
          { label: '8–30 days', value: 980, conv: 1.9 },
          { label: '30+ days', value: 460, conv: 1.2 },
        ],
      },
    ],
  },
];

const goalsBreakdowns: BreakdownCard[] = [
  {
    id: 'goal-performance',
    tabs: [
      {
        id: 'goals',
        label: 'Goals',
        unit: 'events',
        rows: [
          { label: 'Payment succeeded', value: 178 },
          { label: 'Signup completed', value: 2410 },
          { label: 'Provider connected', value: 96 },
          { label: 'Pricing viewed', value: 6420 },
          { label: 'Docs installed', value: 1240 },
        ],
      },
    ],
  },
  {
    id: 'goal-sources',
    tabs: [
      {
        id: 'source',
        label: 'Source',
        unit: 'events',
        rows: [
          { label: 'Product Hunt', value: 640 },
          { label: 'Google', value: 520 },
          { label: 'Newsletter', value: 410 },
          { label: 'Direct', value: 380 },
          { label: 'LinkedIn', value: 220 },
          { label: 'X / Twitter', value: 190 },
        ],
      },
    ],
  },
];

const utmBreakdowns: BreakdownCard[] = [
  {
    id: 'utm-source',
    tabs: [
      {
        id: 'source',
        label: 'Source',
        unit: 'visitors',
        rows: [
          { label: 'producthunt', value: 3120, conv: 2.9 },
          { label: 'google', value: 2480, conv: 2.1 },
          { label: 'newsletter', value: 1340, conv: 4.6 },
          { label: 'linkedin', value: 860, conv: 3.2 },
          { label: 'x', value: 620, conv: 1.8 },
          { label: 'reddit', value: 410, conv: 1.3 },
        ],
      },
    ],
  },
  {
    id: 'utm-medium',
    tabs: [
      {
        id: 'medium',
        label: 'Medium',
        unit: 'visitors',
        rows: [
          { label: 'organic', value: 4820, conv: 2.4 },
          { label: 'social', value: 2940, conv: 2.8 },
          { label: 'email', value: 1340, conv: 4.6 },
          { label: 'referral', value: 980, conv: 3.1 },
          { label: 'paid', value: 760, conv: 1.6 },
        ],
      },
    ],
  },
];

export const VIEWS: Record<ViewId, ViewConfig> = {
  overview: {
    kpis: [
      { label: 'Revenue', value: 4820, format: 'currency', delta: '+18.2%', tone: 'up' },
      { label: 'Visitors', value: 12940, format: 'number', delta: '+9.4%', tone: 'up' },
      {
        label: 'Conversion',
        value: 2.4,
        format: 'percent',
        delta: '+0.6 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Payments', value: 178, format: 'number', delta: '+22.1%', tone: 'up' },
      {
        label: 'Avg. order',
        value: 27.08,
        format: 'currency',
        delta: '+4.8%',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Bounce',
        value: 38.2,
        format: 'percent',
        delta: '-2.4 pt',
        tone: 'down',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Revenue by day',
      legend: 'Payments',
      metric: 'revenue',
      total: 4820,
      format: 'currency',
    },
    breakdowns: [acquisition, geography, pages, technology],
    table: {
      tabs: [
        {
          id: 'visitors',
          label: 'Visitors',
          columns: ['Visitor', 'Acquisition source', 'Visits', 'Events', 'Spend', 'Activity'],
          rows: [
            ['Visitor 1202a1a7', 'newsletter', 3, 8, '$29.00', '5 minutes ago'],
            ['Visitor 1043f89f', 'Direct', 2, 5, '$0', 'about 1 hour ago'],
            ['Visitor 2f5da4f2', 'producthunt', 1, 3, '$14.99', 'about 2 hours ago'],
            ['Visitor 8c8f269b', 'youtube', 4, 11, '$0', 'about 3 hours ago'],
            ['Visitor cab998af', 'reddit', 1, 2, '$7.99', 'about 4 hours ago'],
            ['Visitor df0c8df6', 'linkedin', 2, 7, '$14.99', 'about 5 hours ago'],
            ['Visitor 64b31d0c', 'google', 1, 4, '$0', 'about 6 hours ago'],
            ['Visitor 0df2e91c', 'google', 5, 14, '$29.00', 'about 8 hours ago'],
          ],
        },
        {
          id: 'events',
          label: 'Events',
          columns: ['Event', 'Visitor', 'Source', 'Page', 'Time'],
          rows: [
            ['payment_succeeded', 'Visitor 1202a1a7', 'newsletter', '/checkout', '5 minutes ago'],
            ['signup_completed', 'Visitor 1043f89f', 'Direct', '/signup', 'about 1 hour ago'],
            [
              'provider_connected',
              'Visitor 2f5da4f2',
              'producthunt',
              '/settings',
              'about 2 hours ago',
            ],
            ['checkout_started', 'Visitor 8c8f269b', 'youtube', '/pricing', 'about 3 hours ago'],
            ['pageview', 'Visitor cab998af', 'reddit', '/features', 'about 4 hours ago'],
            ['session_start', 'Visitor df0c8df6', 'linkedin', '/', 'about 5 hours ago'],
          ],
        },
        {
          id: 'funnels',
          label: 'Funnels',
          columns: ['Funnel', 'Entered', 'Completed', 'Conversion', 'Revenue'],
          rows: [
            ['Signup funnel', '12,940', '2,410', '18.6%', '$4,820'],
            ['Activation funnel', '2,410', '1,240', '51.5%', '$3,590'],
            ['Checkout funnel', '1,120', '640', '57.1%', '$4,320'],
            ['Provider funnel', '640', '96', '15.0%', '$1,280'],
          ],
        },
        {
          id: 'journey',
          label: 'Journey',
          columns: ['Journey', 'Touchpoints', 'Revenue', 'Conversion', 'Last seen'],
          rows: [
            ['Google → / → pricing', '4', '$1,210', '4.8%', '2 minutes ago'],
            ['PH → / → signup', '3', '$1,940', '3.6%', '8 minutes ago'],
            ['LinkedIn → blog → pricing', '5', '$1,120', '2.9%', '22 minutes ago'],
            ['Newsletter → features', '2', '$790', '5.2%', '1 hour ago'],
            ['Direct → docs → signup', '4', '$480', '3.1%', '2 hours ago'],
          ],
        },
        {
          id: 'payments',
          label: 'Payments',
          columns: ['Customer', 'Amount', 'Plan', 'Source', 'Time'],
          rows: [
            ['Ankita Shil', '$14.99', 'Pro monthly', 'newsletter', '5 minutes ago'],
            ['Marco Silva', '$7.99', 'Starter monthly', 'reddit', '41 minutes ago'],
            ['Dana Meyer', '$14.99', 'Pro monthly', 'producthunt', '2 hours ago'],
            ['Ravi Patel', '$29.00', 'Pro annual', 'google', '3 hours ago'],
            ['Lena Fischer', '$7.99', 'Starter monthly', 'linkedin', '5 hours ago'],
            ['Tom Becker', '$14.99', 'Pro monthly', 'google', '6 hours ago'],
          ],
        },
      ],
    },
  },

  revenue: {
    kpis: [
      { label: 'Revenue', value: 4820, format: 'currency', delta: '+18.2%', tone: 'up' },
      { label: 'Payments', value: 178, format: 'number', delta: '+22.1%', tone: 'up' },
      { label: 'ARPU', value: 27.08, format: 'currency', delta: '+4.8%', tone: 'up', scale: false },
      { label: 'MRR', value: 3940, format: 'currency', delta: '+11.6%', tone: 'up' },
      { label: 'Refunds', value: 126, format: 'currency', delta: '-0.8%', tone: 'down' },
      {
        label: 'Checkout conv.',
        value: 4.1,
        format: 'percent',
        delta: '+0.4 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Revenue by day',
      legend: 'Payments',
      metric: 'revenue',
      total: 4820,
      format: 'currency',
    },
    breakdowns: [revenueBreakdown, revenuePlans, acquisition, technology],
    table: {
      tabs: [
        {
          id: 'payments',
          label: 'Payments',
          columns: ['Customer', 'Amount', 'Plan', 'Source', 'Time'],
          rows: [
            ['Ankita Shil', '$14.99', 'Pro monthly', 'newsletter', '5 minutes ago'],
            ['Marco Silva', '$7.99', 'Starter monthly', 'reddit', '41 minutes ago'],
            ['Dana Meyer', '$14.99', 'Pro monthly', 'producthunt', '2 hours ago'],
            ['Ravi Patel', '$29.00', 'Pro annual', 'google', '3 hours ago'],
            ['Lena Fischer', '$7.99', 'Starter monthly', 'linkedin', '5 hours ago'],
            ['Tom Becker', '$14.99', 'Pro monthly', 'google', '6 hours ago'],
          ],
        },
        {
          id: 'subscriptions',
          label: 'Subscriptions',
          columns: ['Customer', 'Plan', 'MRR', 'Status', 'Renewal'],
          rows: [
            ['Ankita Shil', 'Pro monthly', '$14.99', 'Active', 'Dec 10'],
            ['Marco Silva', 'Starter monthly', '$7.99', 'Active', 'Dec 9'],
            ['Dana Meyer', 'Pro monthly', '$14.99', 'Active', 'Dec 8'],
            ['Ravi Patel', 'Pro annual', '$2.42', 'Active', 'Nov 2, 2027'],
            ['Lena Fischer', 'Starter monthly', '$7.99', 'Active', 'Dec 5'],
          ],
        },
        {
          id: 'refunds',
          label: 'Refunds',
          columns: ['Customer', 'Amount', 'Reason', 'Source', 'Date'],
          rows: [
            ['Chris Owen', '$14.99', 'Duplicate charge', 'direct', 'Nov 9'],
            ['Mia Laurent', '$7.99', 'Changed plan', 'google', 'Nov 8'],
            ['Sam Lee', '$14.99', 'Requested', 'x.com', 'Nov 7'],
            ['Nora Weiss', '$7.99', 'Trial mismatch', 'linkedin', 'Nov 6'],
          ],
        },
      ],
    },
  },

  visitors: {
    kpis: [
      { label: 'Visitors', value: 12940, format: 'number', delta: '+9.4%', tone: 'up' },
      { label: 'Unique', value: 9840, format: 'number', delta: '+7.8%', tone: 'up' },
      { label: 'Sessions', value: 15620, format: 'number', delta: '+12.1%', tone: 'up' },
      {
        label: 'Bounce',
        value: 38.2,
        format: 'percent',
        delta: '-2.4 pt',
        tone: 'down',
        scale: false,
      },
      {
        label: 'Avg. duration',
        value: 102,
        format: 'duration',
        delta: '+8s',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Pages / session',
        value: 2.8,
        format: 'text',
        delta: '+0.2',
        tone: 'up',
        scale: false,
        suffix: '',
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Visitors by day',
      legend: 'Visitors',
      metric: 'visitors',
      total: 12940,
      format: 'number',
    },
    breakdowns: [acquisition, geography, pages, technology],
    table: {
      tabs: [
        {
          id: 'visitors',
          label: 'Visitors',
          columns: ['Visitor', 'Acquisition source', 'Visits', 'Events', 'Spend', 'Activity'],
          rows: [
            ['Visitor 1202a1a7', 'newsletter', 3, 8, '$29.00', '5 minutes ago'],
            ['Visitor 1043f89f', 'Direct', 2, 5, '$0', 'about 1 hour ago'],
            ['Visitor 2f5da4f2', 'producthunt', 1, 3, '$14.99', 'about 2 hours ago'],
            ['Visitor 8c8f269b', 'youtube', 4, 11, '$0', 'about 3 hours ago'],
            ['Visitor cab998af', 'reddit', 1, 2, '$7.99', 'about 4 hours ago'],
            ['Visitor df0c8df6', 'linkedin', 2, 7, '$14.99', 'about 5 hours ago'],
            ['Visitor 64b31d0c', 'google', 1, 4, '$0', 'about 6 hours ago'],
            ['Visitor 0df2e91c', 'google', 5, 14, '$29.00', 'about 8 hours ago'],
          ],
        },
        {
          id: 'sessions',
          label: 'Sessions',
          columns: ['Session', 'Visitor', 'Duration', 'Pages', 'Source', 'Started'],
          rows: [
            ['sess_9f21a', 'Visitor 1202a1a7', '4m 12s', 5, 'newsletter', '5 minutes ago'],
            ['sess_2c84b', 'Visitor 1043f89f', '1m 38s', 2, 'Direct', 'about 1 hour ago'],
            ['sess_77de0', 'Visitor 2f5da4f2', '3m 04s', 4, 'producthunt', 'about 2 hours ago'],
            ['sess_1aa93', 'Visitor 8c8f269b', '2m 26s', 3, 'youtube', 'about 3 hours ago'],
            ['sess_4be17', 'Visitor cab998af', '0m 54s', 1, 'reddit', 'about 4 hours ago'],
          ],
        },
        {
          id: 'events',
          label: 'Events',
          columns: ['Event', 'Visitor', 'Source', 'Page', 'Time'],
          rows: [
            ['pageview', 'Visitor 1202a1a7', 'newsletter', '/', '5 minutes ago'],
            ['pricing_viewed', 'Visitor 1202a1a7', 'newsletter', '/pricing', '4 minutes ago'],
            ['signup_completed', 'Visitor 1043f89f', 'Direct', '/signup', 'about 1 hour ago'],
            [
              'docs_installed',
              'Visitor 2f5da4f2',
              'producthunt',
              '/docs/install',
              'about 2 hours ago',
            ],
          ],
        },
      ],
    },
  },

  events: {
    kpis: [
      { label: 'Events', value: 84320, format: 'number', delta: '+14.6%', tone: 'up' },
      { label: 'Pageviews', value: 61240, format: 'number', delta: '+11.2%', tone: 'up' },
      { label: 'Custom', value: 18640, format: 'number', delta: '+21.8%', tone: 'up' },
      { label: 'Errors', value: 126, format: 'number', delta: '-4.2%', tone: 'down' },
      {
        label: 'Events / session',
        value: 5.4,
        format: 'text',
        delta: '+0.3',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Conversion',
        value: 2.4,
        format: 'percent',
        delta: '+0.6 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Events by day',
      legend: 'All events',
      metric: 'events',
      total: 84320,
      format: 'number',
    },
    breakdowns: [eventBreakdown, pages, technology, acquisition],
    table: {
      tabs: [
        {
          id: 'events',
          label: 'Events',
          columns: ['Event', 'Visitor', 'Source', 'Page', 'Time'],
          rows: [
            ['payment_succeeded', 'Visitor 1202a1a7', 'newsletter', '/checkout', '5 minutes ago'],
            ['signup_completed', 'Visitor 1043f89f', 'Direct', '/signup', 'about 1 hour ago'],
            [
              'provider_connected',
              'Visitor 2f5da4f2',
              'producthunt',
              '/settings',
              'about 2 hours ago',
            ],
            ['checkout_started', 'Visitor 8c8f269b', 'youtube', '/pricing', 'about 3 hours ago'],
            ['pageview', 'Visitor cab998af', 'reddit', '/features', 'about 4 hours ago'],
            ['replay_started', 'Visitor df0c8df6', 'linkedin', '/', 'about 5 hours ago'],
          ],
        },
        {
          id: 'live',
          label: 'Live feed',
          columns: ['Time', 'Event', 'Visitor', 'Page', 'Country'],
          rows: [
            ['Just now', 'pageview', 'Visitor 1202a1a7', '/pricing', '🇺🇸 US'],
            ['12s ago', 'pricing_viewed', 'Visitor 1202a1a7', '/pricing', '🇺🇸 US'],
            ['48s ago', 'pageview', 'Visitor 91ab2c0e', '/', '🇬🇧 UK'],
            ['1m ago', 'signup_started', 'Visitor 91ab2c0e', '/signup', '🇬🇧 UK'],
            ['2m ago', 'pageview', 'Visitor 4d8f1e2b', '/docs', '🇩🇪 DE'],
          ],
        },
      ],
    },
  },

  funnels: {
    kpis: [
      { label: 'Entered', value: 12940, format: 'number', delta: '+9.4%', tone: 'up' },
      { label: 'Completed', value: 640, format: 'number', delta: '+16.2%', tone: 'up' },
      {
        label: 'Conversion',
        value: 4.9,
        format: 'percent',
        delta: '+0.8 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Revenue', value: 4820, format: 'currency', delta: '+18.2%', tone: 'up' },
      {
        label: 'Avg. time',
        value: 2.4,
        format: 'text',
        delta: '-0.2d',
        tone: 'down',
        scale: false,
        suffix: 'd',
      },
      {
        label: 'Drop-off',
        value: 95.1,
        format: 'percent',
        delta: '-0.8 pt',
        tone: 'down',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Funnel completions',
      legend: 'Completed',
      metric: 'events',
      total: 640,
      format: 'number',
    },
    funnels: [
      {
        id: 'signup',
        label: 'Signup funnel',
        steps: [
          { label: 'Landing page', value: 12940 },
          { label: 'Pricing viewed', value: 6420 },
          { label: 'Signup started', value: 3180 },
          { label: 'Signup completed', value: 2410 },
          { label: 'Provider connected', value: 1120 },
          { label: 'First payment', value: 640 },
        ],
      },
      {
        id: 'activation',
        label: 'Activation funnel',
        steps: [
          { label: 'Signup completed', value: 2410 },
          { label: 'Tracker installed', value: 1860 },
          { label: 'First event', value: 1640 },
          { label: 'Provider connected', value: 1120 },
          { label: 'Revenue matched', value: 960 },
          { label: 'Weekly active', value: 740 },
        ],
      },
      {
        id: 'checkout',
        label: 'Checkout funnel',
        steps: [
          { label: 'Pricing viewed', value: 6420 },
          { label: 'Plan selected', value: 2140 },
          { label: 'Checkout started', value: 1120 },
          { label: 'Payment succeeded', value: 640 },
          { label: 'Subscription active', value: 598 },
        ],
      },
    ],
    breakdowns: [acquisition, revenuePlans],
    table: {
      tabs: [
        {
          id: 'funnels',
          label: 'Funnels',
          columns: ['Funnel', 'Entered', 'Completed', 'Conversion', 'Revenue'],
          rows: [
            ['Signup funnel', '12,940', '640', '4.9%', '$4,820'],
            ['Activation funnel', '2,410', '740', '30.7%', '$3,590'],
            ['Checkout funnel', '6,420', '598', '9.3%', '$4,320'],
          ],
        },
      ],
    },
  },

  replays: {
    kpis: [
      { label: 'Replays', value: 64, format: 'number', delta: '+12.8%', tone: 'up' },
      { label: 'Watch time', value: 8040, format: 'duration', delta: '+9.2%', tone: 'up' },
      {
        label: 'Avg. session',
        value: 252,
        format: 'duration',
        delta: '+18s',
        tone: 'up',
        scale: false,
      },
      { label: 'Rage clicks', value: 6, format: 'number', delta: '-2', tone: 'down', scale: false },
      { label: 'Errors', value: 3, format: 'number', delta: '-1', tone: 'down', scale: false },
      {
        label: 'Completed',
        value: 72,
        format: 'percent',
        delta: '+4.1 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    replays: [
      {
        id: 'rp_9f21a',
        visitor: 'Visitor 1202a1a7',
        country: 'United Kingdom',
        flag: '🇬🇧',
        browser: 'Chrome',
        os: 'macOS',
        device: 'Desktop',
        duration: '4m 12s',
        pages: 5,
        activity: '5 minutes ago',
        issues: 'Rage click',
      },
      {
        id: 'rp_2c84b',
        visitor: 'Visitor 1043f89f',
        country: 'Germany',
        flag: '🇩🇪',
        browser: 'Edge',
        os: 'Windows',
        device: 'Desktop',
        duration: '1m 38s',
        pages: 2,
        activity: 'about 1 hour ago',
      },
      {
        id: 'rp_77de0',
        visitor: 'Visitor 2f5da4f2',
        country: 'Canada',
        flag: '🇨🇦',
        browser: 'Chrome',
        os: 'macOS',
        device: 'Desktop',
        duration: '3m 04s',
        pages: 4,
        activity: 'about 2 hours ago',
      },
      {
        id: 'rp_1aa93',
        visitor: 'Visitor 8c8f269b',
        country: 'Spain',
        flag: '🇪🇸',
        browser: 'Safari',
        os: 'iOS',
        device: 'Mobile',
        duration: '2m 26s',
        pages: 3,
        activity: 'about 3 hours ago',
      },
      {
        id: 'rp_4be17',
        visitor: 'Visitor cab998af',
        country: 'Singapore',
        flag: '🇸🇬',
        browser: 'Firefox',
        os: 'Linux',
        device: 'Desktop',
        duration: '0m 54s',
        pages: 1,
        activity: 'about 4 hours ago',
        issues: 'Error',
      },
      {
        id: 'rp_6ba03',
        visitor: 'Visitor df0c8df6',
        country: 'Brazil',
        flag: '🇧🇷',
        browser: 'Edge',
        os: 'Android',
        device: 'Mobile',
        duration: '5m 41s',
        pages: 7,
        activity: 'about 5 hours ago',
      },
      {
        id: 'rp_31cf9',
        visitor: 'Visitor 64b31d0c',
        country: 'India',
        flag: '🇮🇳',
        browser: 'Chrome',
        os: 'Windows',
        device: 'Desktop',
        duration: '3m 18s',
        pages: 4,
        activity: 'about 6 hours ago',
      },
      {
        id: 'rp_08ac2',
        visitor: 'Visitor 0df2e91c',
        country: 'United States',
        flag: '🇺🇸',
        browser: 'Safari',
        os: 'macOS',
        device: 'Desktop',
        duration: '6m 02s',
        pages: 8,
        activity: 'about 8 hours ago',
      },
    ],
  },

  journeys: {
    kpis: [
      { label: 'Journeys', value: 12940, format: 'number', delta: '+9.4%', tone: 'up' },
      { label: 'Touchpoints', value: 3.4, format: 'text', delta: '+0.2', tone: 'up', scale: false },
      {
        label: 'Time to convert',
        value: 2.4,
        format: 'text',
        delta: '-0.2d',
        tone: 'down',
        scale: false,
        suffix: 'd',
      },
      { label: 'Assisted revenue', value: 2140, format: 'currency', delta: '+14.2%', tone: 'up' },
      { label: 'First touch', value: 1860, format: 'currency', delta: '+8.9%', tone: 'up' },
      { label: 'Last touch', value: 2960, format: 'currency', delta: '+12.4%', tone: 'up' },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Revenue by touchpoint',
      legend: 'Assisted revenue',
      metric: 'revenue',
      total: 4820,
      format: 'currency',
    },
    breakdowns: journeyBreakdowns,
    table: {
      tabs: [
        {
          id: 'journeys',
          label: 'Journeys',
          columns: ['Journey', 'Touchpoints', 'Revenue', 'Conversion', 'Last seen'],
          rows: [
            ['Google → / → pricing', '4', '$1,210', '4.8%', '2 minutes ago'],
            ['PH → / → signup', '3', '$1,940', '3.6%', '8 minutes ago'],
            ['LinkedIn → blog → pricing', '5', '$1,120', '2.9%', '22 minutes ago'],
            ['Newsletter → features', '2', '$790', '5.2%', '1 hour ago'],
            ['Direct → docs → signup', '4', '$480', '3.1%', '2 hours ago'],
            ['X → pricing → checkout', '3', '$590', '1.8%', '3 hours ago'],
          ],
        },
      ],
    },
  },

  goals: {
    kpis: [
      { label: 'Goals', value: 12, format: 'number', delta: '+2', tone: 'up', scale: false },
      { label: 'Conversions', value: 640, format: 'number', delta: '+16.2%', tone: 'up' },
      { label: 'Revenue', value: 4820, format: 'currency', delta: '+18.2%', tone: 'up' },
      {
        label: 'Best goal',
        value: 178,
        format: 'number',
        delta: 'Payment',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Signup rate',
        value: 18.6,
        format: 'percent',
        delta: '+1.2 pt',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Provider rate',
        value: 46.5,
        format: 'percent',
        delta: '+3.1 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Goal completions',
      legend: 'Conversions',
      metric: 'events',
      total: 640,
      format: 'number',
    },
    breakdowns: goalsBreakdowns,
    table: {
      tabs: [
        {
          id: 'goals',
          label: 'Goals',
          columns: ['Goal', 'Type', 'Completions', 'Revenue', 'Conversion'],
          rows: [
            ['Payment succeeded', 'Payment', '178', '$4,820', '2.4%'],
            ['Signup completed', 'Signup', '2,410', '$0', '18.6%'],
            ['Provider connected', 'Activation', '96', '$0', '46.5%'],
            ['Pricing viewed', 'Page', '6,420', '$0', '49.6%'],
            ['Docs installed', 'Custom', '1,240', '$0', '9.6%'],
          ],
        },
      ],
    },
  },

  utm: {
    kpis: [
      { label: 'Campaigns', value: 24, format: 'number', delta: '+3', tone: 'up', scale: false },
      { label: 'UTM sessions', value: 8420, format: 'number', delta: '+11.8%', tone: 'up' },
      { label: 'Revenue', value: 3210, format: 'currency', delta: '+15.4%', tone: 'up' },
      {
        label: 'Best ROAS',
        value: 6.4,
        format: 'text',
        delta: '+0.8',
        tone: 'up',
        scale: false,
        suffix: 'x',
      },
      { label: 'Paid revenue', value: 760, format: 'currency', delta: '+6.2%', tone: 'up' },
      {
        label: 'Conversion',
        value: 2.4,
        format: 'percent',
        delta: '+0.4 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    chart: {
      title: 'Revenue by campaign',
      legend: 'Revenue',
      metric: 'revenue',
      total: 3210,
      format: 'currency',
    },
    breakdowns: utmBreakdowns,
    table: {
      tabs: [
        {
          id: 'campaigns',
          label: 'Campaigns',
          columns: ['Campaign', 'Source / Medium', 'Sessions', 'Revenue', 'ROAS'],
          rows: [
            ['launch-week', 'producthunt / social', '3,120', '$1,940', '6.4x'],
            ['newsletter-oct', 'newsletter / email', '1,340', '$790', '4.8x'],
            ['founder-story', 'linkedin / social', '860', '$330', '3.2x'],
            ['retargeting', 'google / paid', '760', '$170', '1.6x'],
            ['product-hunt', 'producthunt / social', '980', '$480', '2.9x'],
          ],
        },
      ],
    },
  },

  retention: {
    kpis: [
      {
        label: 'Returning',
        value: 34.2,
        format: 'percent',
        delta: '+2.8 pt',
        tone: 'up',
        scale: false,
      },
      {
        label: 'D7 retention',
        value: 22.4,
        format: 'percent',
        delta: '+1.6 pt',
        tone: 'up',
        scale: false,
      },
      {
        label: 'D30 retention',
        value: 12.8,
        format: 'percent',
        delta: '+0.9 pt',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Sessions / user',
        value: 1.8,
        format: 'text',
        delta: '+0.1',
        tone: 'up',
        scale: false,
      },
      {
        label: 'Churn',
        value: 4.1,
        format: 'percent',
        delta: '-0.6 pt',
        tone: 'down',
        scale: false,
      },
      {
        label: 'Revenue retention',
        value: 104,
        format: 'percent',
        delta: '+3.2 pt',
        tone: 'up',
        scale: false,
      },
      { label: 'Online', value: 24, format: 'number', live: true, scale: false },
    ],
    retention: {
      headings: ['Cohort', 'Visitors', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      cohorts: [
        { label: 'Oct 6', visitors: '2,140', values: [100, 42, 31, 24, 19, 15, 12] },
        { label: 'Oct 13', visitors: '1,980', values: [100, 46, 34, 27, 21, 17] },
        { label: 'Oct 20', visitors: '2,260', values: [100, 48, 36, 29, 23] },
        { label: 'Oct 27', visitors: '2,480', values: [100, 51, 38, 30] },
        { label: 'Nov 3', visitors: '2,120', values: [100, 53, 41] },
        { label: 'Nov 10', visitors: '1,960', values: [100, 55] },
      ],
    },
    breakdowns: [acquisition, technology],
    table: {
      tabs: [
        {
          id: 'cohorts',
          label: 'Cohorts',
          columns: ['Cohort', 'Visitors', 'D7', 'D30', 'Revenue', 'Churn'],
          rows: [
            ['Oct 6', '2,140', '42%', '19%', '$980', '4.6%'],
            ['Oct 13', '1,980', '46%', '21%', '$1,120', '4.2%'],
            ['Oct 20', '2,260', '48%', '23%', '$1,240', '3.9%'],
            ['Oct 27', '2,480', '51%', '—', '$1,480', '3.7%'],
            ['Nov 3', '2,120', '53%', '—', '$1,260', '3.4%'],
          ],
        },
      ],
    },
  },
};

/** A small, stable LCG so the chart is identical on every render. */
function seededSeries(seed: number, points: number, total: number): number[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const weights = Array.from({ length: points }, (_, index) => {
    const progress = points <= 1 ? 0 : index / (points - 1);
    const trend = 0.72 + progress * 0.62;
    const wave = 0.86 + Math.sin(index * 0.82 + seed * 0.01) * 0.16;
    const noise = 0.8 + next() * 0.4;
    return trend * wave * noise;
  });

  const sum = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map(weight => (weight / sum) * total);
}

export function getRange(value: RangeKey) {
  return RANGE_OPTIONS.find(option => option.value === value) ?? RANGE_OPTIONS[2];
}

export function getChartSeries(
  view: ViewId,
  range: RangeKey,
  total: number,
  factor: number,
): number[] {
  const rangeOption = getRange(range);
  const seed =
    `${view}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + rangeOption.points;
  return seededSeries(seed, rangeOption.points, total * rangeOption.factor * factor);
}

export function formatMetric(value: number, format: KpiFormat): string {
  if (format === 'currency') {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }

  if (format === 'duration') {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
  }

  if (format === 'text') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatCompact(value: number, format: KpiFormat): string {
  if (format === 'currency') {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    }
    return `$${Math.round(value)}`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return `${Math.round(value)}`;
}

export function rowTotal(rows: Row[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
