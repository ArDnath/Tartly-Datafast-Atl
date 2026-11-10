function truncateLabel(value: string, max = 16) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export interface PortfolioChartPoint {
  date: string;
  visitors: number;
  revenue: number;
  payments: number;
}

export interface PortfolioSite {
  name: string;
  metrics: {
    visitors: number;
    revenue: number;
    payments: number;
  };
  chart?: {
    date: string;
    visitors: number;
    revenue: number;
    payments: number;
  }[];
}

export interface WebsiteRevenueRow {
  label: string;
  bar: number;
  line: number;
}

export interface PortfolioSankey {
  nodes: { name: string; label: string }[];
  links: { source: string; target: string; value: number }[];
}

/** Merge each site's daily rows into one portfolio series, keyed by date. */
export function mergePortfolioCharts(sites: PortfolioSite[]): PortfolioChartPoint[] {
  const byDate = new Map<string, PortfolioChartPoint>();

  for (const site of sites) {
    for (const point of site.chart ?? []) {
      if (!point?.date) {
        continue;
      }

      const row = byDate.get(point.date) ?? {
        date: point.date,
        visitors: 0,
        revenue: 0,
        payments: 0,
      };

      row.visitors += Number(point.visitors) || 0;
      row.revenue += Number(point.revenue) || 0;
      row.payments += Number(point.payments) || 0;
      byDate.set(point.date, row);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Revenue per site, with visitors as the comparison line. The long tail folds
 * into one "Other sites" row so a twenty-site agency account stays readable.
 */
export function buildWebsiteRevenueRows(sites: PortfolioSite[], limit = 8): WebsiteRevenueRow[] {
  const sorted = [...sites]
    .map(site => ({
      label: site.name,
      revenue: Number(site.metrics.revenue) || 0,
      visitors: Number(site.metrics.visitors) || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  if (sorted.length <= limit) {
    return sorted.map(site => ({
      label: site.label,
      bar: site.revenue,
      line: site.visitors,
    }));
  }

  const visible = sorted.slice(0, limit);
  const rest = sorted.slice(limit);

  return [
    ...visible.map(site => ({
      label: site.label,
      bar: site.revenue,
      line: site.visitors,
    })),
    {
      label: 'Other sites',
      bar: rest.reduce((sum, site) => sum + site.revenue, 0),
      line: rest.reduce((sum, site) => sum + site.visitors, 0),
    },
  ];
}

/**
 * Portfolio traffic flow: every site receives visitors from one pooled source,
 * then splits into converted and unconverted visitors. Values stay in visitor
 * units so the sankey conserves flow at every stage.
 */
export function buildPortfolioSankey(sites: PortfolioSite[]): PortfolioSankey {
  const active = sites
    .map(site => ({
      name: site.name,
      visitors: Math.max(0, Number(site.metrics.visitors) || 0),
      payments: Math.max(0, Number(site.metrics.payments) || 0),
    }))
    .filter(site => site.visitors > 0);

  if (active.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodes: PortfolioSankey['nodes'] = [{ name: 'all', label: 'All visitors' }];
  const links: PortfolioSankey['links'] = [];
  const converted = 'converted';
  const unconverted = 'unconverted';
  let hasConverted = false;
  let hasUnconverted = false;

  active.forEach((site, index) => {
    const key = `site-${index}`;

    nodes.push({ name: key, label: truncateLabel(site.name) });
    links.push({ source: 'all', target: key, value: site.visitors });

    const conversions = Math.min(site.payments, site.visitors);

    if (conversions > 0) {
      hasConverted = true;
      links.push({ source: key, target: converted, value: conversions });
    }

    const remaining = site.visitors - conversions;

    if (remaining > 0) {
      hasUnconverted = true;
      links.push({ source: key, target: unconverted, value: remaining });
    }
  });

  if (hasConverted) {
    nodes.push({ name: converted, label: 'Converted' });
  }

  if (hasUnconverted) {
    nodes.push({ name: unconverted, label: 'Did not convert' });
  }

  return { nodes, links };
}

/** Axis/tooltip label for a stats date bucket; keeps time when present. */
export function formatPortfolioChartDate(date: string) {
  const parsed = new Date(date.includes(' ') ? date.replace(' ', 'T') : date);

  if (!Number.isFinite(parsed.getTime())) {
    return date;
  }

  const hasTime = /[ T]\d{2}:\d{2}/.test(date) || /[ T]\d{2}$/.test(date);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(hasTime ? { hour: 'numeric' } : {}),
  }).format(parsed);
}
