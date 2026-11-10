/**
 * Colour plumbing for the ECharts surfaces.
 *
 * The charts live in two very different skins: the marketing preview scopes its
 * palette inside `.frame` with `--d-*` tokens, while the product shell exposes
 * `--accent-text`, `--text-*`, and `--talivia-*` tokens on `:root`. Reading the
 * live computed values (instead of hard-coding hex pairs) keeps the charts in
 * step with the light/dark toggle without a second theme map.
 */
export interface ChartColors {
  text: string;
  muted: string;
  grid: string;
  surface: string;
  border: string;
  accent: string;
  accentAlt: string;
  positive: string;
  negative: string;
  fontFamily: string;
}

export const FALLBACK_CHART_COLORS: ChartColors = {
  text: '#1f1f1f',
  muted: '#66655f',
  grid: 'rgba(31, 31, 31, 0.1)',
  surface: '#ffffff',
  border: 'rgba(31, 31, 31, 0.12)',
  accent: '#a63a60',
  accentAlt: '#3b82f6',
  positive: '#178a4c',
  negative: '#c22f2f',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/** A second, quieter series colour that reads on both the cream and dark skins. */
export const CHART_SECONDARY = '#3b82f6';
export const CHART_TERTIARY = '#8b5cf6';

/** A restrained six-step palette for multi-series and per-bar charts. */
export const CHART_PALETTE = ['#a63a60', '#3b82f6', '#8b5cf6', '#0f8a5f', '#d97706', '#0891b2'];

function readToken(styles: CSSStyleDeclaration, names: string[], fallback: string) {
  for (const name of names) {
    const value = styles.getPropertyValue(name).trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

/** Reads the chart tokens from a live element (root by default). */
export function readChartColors(element?: HTMLElement | null): ChartColors {
  if (typeof window === 'undefined') {
    return FALLBACK_CHART_COLORS;
  }

  const target = element ?? document.documentElement;
  const styles = window.getComputedStyle(target);
  const resolvedFont = readToken(styles, ['--font-family'], FALLBACK_CHART_COLORS.fontFamily);

  return {
    text: readToken(styles, ['--d-text', '--text-primary', '--text-strong'], '#1f1f1f'),
    muted: readToken(styles, ['--d-muted', '--text-muted'], '#66655f'),
    grid: readToken(
      styles,
      ['--d-grid', '--talivia-card-border', '--border-muted'],
      'rgba(31, 31, 31, 0.1)',
    ),
    surface: readToken(
      styles,
      ['--d-surface', '--talivia-card-background', '--surface-base'],
      '#ffffff',
    ),
    border: readToken(
      styles,
      ['--d-line-strong', '--talivia-card-border', '--border-default'],
      'rgba(31, 31, 31, 0.12)',
    ),
    accent: readToken(styles, ['--d-accent', '--accent-text', '--primary'], '#a63a60'),
    accentAlt: readToken(
      styles,
      ['--d-good', '--status-success', '--accent-text'],
      CHART_SECONDARY,
    ),
    positive: readToken(styles, ['--d-good', '--status-success'], '#178a4c'),
    negative: readToken(styles, ['--d-bad', '--status-error'], '#c22f2f'),
    fontFamily: resolvedFont.includes('var(') ? FALLBACK_CHART_COLORS.fontFamily : resolvedFont,
  };
}

/**
 * Applies an alpha channel to a CSS colour. Hex, `rgb()`, `rgba()`, and CSS
 * custom-property values are supported; anything unrecognised is returned
 * untouched so a malformed theme token never breaks a chart.
 */
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim();
  const clamped = Math.max(0, Math.min(1, alpha));

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const expanded =
      hex.length === 3
        ? hex
            .split('')
            .map(char => `${char}${char}`)
            .join('')
        : hex;

    if (expanded.length !== 6 && expanded.length !== 8) {
      return value;
    }

    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);

    if ([red, green, blue].some(Number.isNaN)) {
      return value;
    }

    return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);

  if (rgb) {
    const [red, green, blue] = rgb[1]
      .split(',')
      .map(channel => Number.parseFloat(channel.trim()))
      .filter(Number.isFinite);

    if ([red, green, blue].every(Number.isFinite)) {
      return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
    }
  }

  return value;
}

/** A compact, locale-stable number for axis labels and tooltips. */
export function formatCompactNumber(value: number, currency?: string): string {
  const abs = Math.abs(value);

  if (currency) {
    const prefix = currency === 'USD' ? '$' : '';
    const suffix = currency === 'USD' ? '' : ` ${currency}`;

    if (abs >= 1_000_000) {
      return `${prefix}${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M${suffix}`;
    }

    if (abs >= 1_000) {
      return `${prefix}${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k${suffix}`;
    }

    return `${prefix}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}`;
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Minimal HTML escaping for the HTML tooltip strings ECharts renders. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
