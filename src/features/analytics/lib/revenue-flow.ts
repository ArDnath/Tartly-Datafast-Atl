export interface RevenueFlowChannel {
  label: string;
  visitors: number;
}

export interface RevenueFlowSankey {
  nodes: { name: string; label: string }[];
  links: { source: string; target: string; value: number }[];
}

/**
 * Channel → website → outcome flow, kept in visitor units so the diagram
 * conserves volume. Payments are capped at the channel total; the remainder is
 * the unconverted share.
 */
export function buildRevenueFlowSankey(
  channels: RevenueFlowChannel[],
  payments: number,
): RevenueFlowSankey {
  const active = channels
    .map(channel => ({
      label: channel.label.trim() || 'Unattributed',
      visitors: Math.max(0, Math.round(Number(channel.visitors) || 0)),
    }))
    .filter(channel => channel.visitors > 0);

  if (active.length === 0) {
    return { nodes: [], links: [] };
  }

  const total = active.reduce((sum, channel) => sum + channel.visitors, 0);
  const converted = Math.max(0, Math.min(Math.round(Number(payments) || 0), total));
  const nodes: RevenueFlowSankey['nodes'] = [{ name: 'site', label: 'Site visitors' }];
  const links: RevenueFlowSankey['links'] = [];

  active.forEach((channel, index) => {
    const key = `channel-${index}`;

    nodes.push({ name: key, label: channel.label });
    links.push({ source: key, target: 'site', value: channel.visitors });
  });

  if (converted > 0) {
    nodes.push({ name: 'converted', label: 'Converted' });
    links.push({ source: 'site', target: 'converted', value: converted });
  }

  const remaining = total - converted;

  if (remaining > 0) {
    nodes.push({ name: 'unconverted', label: 'Did not convert' });
    links.push({ source: 'site', target: 'unconverted', value: remaining });
  }

  return { nodes, links };
}

/** Compact chart label for an ISO-ish stats bucket. */
export function formatStatsBucketLabel(date: string) {
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
