import { describe, expect, it } from 'vitest';
import { FALLBACK_CHART_COLORS, formatCompactNumber, withAlpha } from './colors';
import { buildComposedChartOption, buildLineChartOption, buildSankeyChartOption } from './options';

const colors = FALLBACK_CHART_COLORS;

describe('withAlpha', () => {
  it('adds alpha to short and long hex colours', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(withAlpha('#a63a60', 0.25)).toBe('rgba(166, 58, 96, 0.25)');
  });

  it('replaces the alpha of an rgba value', () => {
    expect(withAlpha('rgba(10, 20, 30, 0.9)', 0.4)).toBe('rgba(10, 20, 30, 0.4)');
  });

  it('leaves unrecognised values untouched', () => {
    expect(withAlpha('var(--accent)', 0.5)).toBe('var(--accent)');
  });
});

describe('formatCompactNumber', () => {
  it('formats plain and compact values', () => {
    expect(formatCompactNumber(920)).toBe('920');
    expect(formatCompactNumber(12_400)).toBe('12k');
    expect(formatCompactNumber(2_400_000)).toBe('2.4M');
  });

  it('keeps a currency prefix', () => {
    expect(formatCompactNumber(4_820, 'USD')).toBe('$4.8k');
    expect(formatCompactNumber(120, 'EUR')).toBe('120 EUR');
  });
});

describe('buildLineChartOption', () => {
  it('draws one line per series and exposes the category labels', () => {
    const option: any = buildLineChartOption({
      labels: ['Nov 9', 'Nov 10'],
      series: [
        { key: 'revenue', label: 'Revenue', color: '#a63a60', data: [10, 20], area: true },
        {
          key: 'previous',
          label: 'Previous',
          color: '#66655f',
          data: [8, 15],
          dashed: true,
        },
      ],
      colors,
      showLegend: true,
    });

    expect(option.xAxis.data).toEqual(['Nov 9', 'Nov 10']);
    expect(option.series).toHaveLength(2);
    expect(option.series[1].lineStyle.type).toEqual([5, 5]);
    expect(option.series[1].areaStyle.color.colorStops[0].color).toContain('0.08');
    expect(option.legend.show).not.toBe(false);
  });
});

describe('buildComposedChartOption', () => {
  it('puts bars behind a line and can use a second value axis', () => {
    const option: any = buildComposedChartOption({
      rows: [
        { label: 'Nov 9', bar: 120, line: 3 },
        { label: 'Nov 10', bar: 160, line: 5 },
      ],
      colors,
      barLabel: 'Revenue',
      lineLabel: 'Payments',
      lineAxis: 'right',
      barColors: ['#a63a60', '#3b82f6'],
    });

    expect(option.series[0].type).toBe('bar');
    expect(option.series[0].data[0].itemStyle.color.colorStops[0].color).toContain('166, 58, 96');
    expect(option.series[0].data[1].itemStyle.color.colorStops[0].color).toContain('59, 130, 246');
    expect(option.series[1].type).toBe('line');
    expect(option.series[1].yAxisIndex).toBe(1);
    expect(option.yAxis).toHaveLength(2);
  });
});

describe('buildSankeyChartOption', () => {
  it('maps node and link references and totals sink nodes', () => {
    const option: any = buildSankeyChartOption({
      nodes: [
        { name: 'search', label: 'Search' },
        { name: 'site', label: 'Website' },
        { name: 'converted', label: 'Converted' },
      ],
      links: [
        { source: 'search', target: 'site', value: 100 },
        { source: 'site', target: 'converted', value: 4 },
      ],
      colors,
    });

    const series = option.series[0];
    expect(series.type).toBe('sankey');
    expect(series.data.map((node: any) => node.name)).toEqual(['search', 'site', 'converted']);
    expect(series.links[0].source).toBe('search');
    expect(series.links[0].lineStyle.color.type).toBe('linear');
  });
});
