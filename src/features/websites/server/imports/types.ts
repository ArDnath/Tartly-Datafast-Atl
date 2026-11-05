import { BRAND } from '@/lib/brand';

export const ANALYTICS_IMPORT_SOURCES = {
  talivia: {
    id: 'talivia',
    name: 'Legacy activity backup',
    description:
      'Restore raw sessions, page views, events, and properties from a compatible activity backup.',
    acceptedFiles: '.zip',
    kind: 'raw',
  },
  umami: {
    id: 'umami',
    name: 'Umami',
    description: `Bring your historical page views, sessions, events, and properties into ${BRAND.name}.`,
    acceptedFiles: '.zip,.gz,.csv,.json',
    kind: 'raw',
  },
  plausible: {
    id: 'plausible',
    name: 'Plausible',
    description: `Bring historical daily traffic and page metrics into ${BRAND.name}.`,
    acceptedFiles: '.zip,.csv',
    kind: 'aggregate',
  },
} as const;

export type AnalyticsImportSource = keyof typeof ANALYTICS_IMPORT_SOURCES;
export type AnalyticsImportKind = 'raw' | 'aggregate';

export interface ImportedSession {
  sourceId: string;
  sourceVisitorId?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  region?: string;
  city?: string;
  distinctId?: string;
  createdAt?: Date;
}

export interface ImportedEvent {
  sourceId: string;
  sourceSessionId: string;
  createdAt: Date;
  urlPath: string;
  urlQuery?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrerPath?: string;
  referrerQuery?: string;
  referrerDomain?: string;
  pageTitle?: string;
  hostname?: string;
  browser?: string;
  os?: string;
  device?: string;
  screen?: string;
  language?: string;
  country?: string;
  region?: string;
  city?: string;
  distinctId?: string;
  eventType: number;
  eventName?: string;
  tag?: string;
  gclid?: string;
  gclsrc?: string;
  wbraid?: string;
  gbraid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  lifatid?: string;
  twclid?: string;
  lcp?: number;
  inp?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

export interface ImportedDataValue {
  sourceParentId: string;
  key: string;
  value: string | number | boolean | string[];
}

export interface ImportedRevenue {
  sourceEventId: string;
  revenue: number;
  currency: string;
}

export interface ParsedAnalyticsImport {
  source: AnalyticsImportSource;
  sessions: ImportedSession[];
  events: ImportedEvent[];
  eventData: ImportedDataValue[];
  sessionData: ImportedDataValue[];
  revenue: ImportedRevenue[];
  metadata: {
    files: string[];
    format?: string;
    dataStartAt?: Date;
    dataEndAt?: Date;
  };
}

export interface ImportedHistoricalMetric {
  date: Date;
  dimension?: string;
  dimensionValue?: string;
  visitors?: number;
  pageviews?: number;
  visits?: number;
  events?: number;
  bounceRate?: number;
  visitDuration?: number;
  revenue?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedHistoricalAnalyticsImport {
  source: Extract<AnalyticsImportSource, 'plausible'>;
  metrics: ImportedHistoricalMetric[];
  metadata: {
    files: string[];
    format: string;
    dataStartAt?: Date;
    dataEndAt?: Date;
  };
}

export interface AnalyticsImportSummary {
  importedSessionCount: number;
  importedEventCount: number;
  importedEventDataCount: number;
  importedRevenueCount: number;
  importedMetricCount?: number;
}
