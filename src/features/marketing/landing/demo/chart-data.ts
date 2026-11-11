import type { Granularity, RangeKey } from './workspace-data';

/**
 * Demo-only chart adapters.
 *
 * The marketing preview is explicitly illustrative, so these helpers derive
 * plausible secondary series and flow values from the already-seeded totals
 * rather than pretending to be a second data source.
 */

const PREVIEW_END = new Date(Date.UTC(2026, 10, 10, 12, 0, 0));
const DAY_MS = 24 * 60 * 60 * 1000;

function formatPreviewDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatPreviewHour(date: Date) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZone: 'UTC' }).format(date);
}

/**
 * Builds one x-axis label per plotted point. The seed series changes length by
 * range and granularity (24 hourly bins, 7 weekly bins, 30 daily points…), so
 * the axis follows the actual point count instead of reusing five captions.
 */
export function getChartLabels(range: RangeKey, granularity: Granularity, count: number): string[] {
  if (count <= 0) {
    return [];
  }

  if (granularity === 'Hour') {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(PREVIEW_END.getTime() - (count - 1 - index) * 60 * 60 * 1000);
      return formatPreviewHour(date);
    });
  }

  const spanDays = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const stepDays = granularity === 'Week' ? 7 : spanDays / Math.max(count - 1, 1);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(PREVIEW_END.getTime() - (count - 1 - index) * stepDays * DAY_MS);
    return formatPreviewDate(date);
  });
}

export type DemoSankey = {
  nodes: { name: string; label: string }[];
  links: { source: string; target: string; value: number }[];
};

/**
 * Acquisition → landing → product → purchase flow, scaled to the selected
 * period/site/filter so the card reacts with the rest of the preview.
 */
export function getDemoSankey(rangeFactor: number, segmentFactor: number): DemoSankey {
  const visitors = Math.max(1, Math.round(12_940 * rangeFactor * segmentFactor));
  const landing = visitors;
  const product = Math.round(landing * 0.62);
  const purchase = Math.max(1, Math.round(product * 0.27));

  return {
    nodes: [
      { name: 'organic', label: 'Organic search' },
      { name: 'paid', label: 'Paid ads' },
      { name: 'social', label: 'Social' },
      { name: 'direct', label: 'Direct' },
      { name: 'landing', label: 'Landing page' },
      { name: 'product', label: 'Product page' },
      { name: 'purchase', label: 'Purchase' },
      { name: 'bounced', label: 'Bounced' },
    ],
    links: [
      { source: 'organic', target: 'landing', value: Math.round(landing * 0.38) },
      { source: 'paid', target: 'landing', value: Math.round(landing * 0.24) },
      { source: 'social', target: 'landing', value: Math.round(landing * 0.21) },
      { source: 'direct', target: 'landing', value: Math.round(landing * 0.17) },
      { source: 'landing', target: 'product', value: product },
      { source: 'landing', target: 'bounced', value: Math.max(1, landing - product) },
      { source: 'product', target: 'purchase', value: purchase },
      { source: 'product', target: 'bounced', value: Math.max(1, product - purchase) },
    ],
  };
}

/** Previous-period comparison for the demo line block. */
export function getComparisonSeries(values: number[], ratio = 0.82): number[] {
  return values.map(value => value * ratio);
}
