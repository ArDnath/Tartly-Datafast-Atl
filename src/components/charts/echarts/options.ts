import type { EChartsCoreOption } from 'echarts/core';
import { type ChartColors, escapeHtml, formatCompactNumber, withAlpha } from './colors';

/**
 * Pure ECharts option builders.
 *
 * Keeping these free of React and of the ECharts runtime makes them cheap to
 * test and lets the components stay declarative. All colours arrive as plain
 * strings, so the builders never touch the DOM.
 */

export type AxisFormatter = (value: number) => string;

export type TooltipFormatter = (value: number) => string;

function tooltipRow(color: string, label: string, value: string) {
  return [
    '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:132px">',
    '<span style="display:inline-flex;align-items:center;gap:6px;min-width:0">',
    `<span style="width:7px;height:7px;border-radius:2px;background:${color};flex:0 0 auto"></span>`,
    `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(label)}</span>`,
    '</span>',
    `<strong style="font-variant-numeric:tabular-nums;font-weight:600">${escapeHtml(value)}</strong>`,
    '</div>',
  ].join('');
}

function tooltipShell(colors: ChartColors, title: string, rows: string) {
  return [
    `<div style="display:grid;gap:5px;padding:8px 10px;border:1px solid ${colors.border};border-radius:10px;`,
    `background:${colors.surface};color:${colors.text};box-shadow:0 18px 44px -26px rgba(0,0,0,.55);`,
    'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font-size:11px;line-height:1.35">',
    `<span style="color:${colors.muted};font-size:10px;text-transform:uppercase;letter-spacing:.06em">${escapeHtml(title)}</span>`,
    rows,
    '</div>',
  ].join('');
}

const TOOLTIP_BASE = {
  backgroundColor: 'transparent',
  borderWidth: 0,
  padding: 0,
  extraCssText: 'box-shadow:none;',
  confine: true,
} as const;

function baseGrid(hasLegend: boolean) {
  return {
    left: 2,
    right: 8,
    top: hasLegend ? 30 : 12,
    bottom: 4,
    outerBoundsMode: 'same',
    outerBoundsContain: 'axisLabel',
  };
}

function baseTextStyle(colors: ChartColors) {
  return { fontFamily: colors.fontFamily, color: colors.text, fontSize: 11 };
}

export interface LineSeriesInput {
  key: string;
  label: string;
  color: string;
  data: (number | null)[];
  /** Draws the halo and the soft area fade under the stroke. */
  area?: boolean;
  dashed?: boolean;
}

export interface LineChartOptionInput {
  labels: string[];
  series: LineSeriesInput[];
  colors: ChartColors;
  formatValue?: TooltipFormatter;
  formatAxis?: AxisFormatter;
  showLegend?: boolean;
}

export function buildLineChartOption({
  labels,
  series,
  colors,
  formatValue = value => value.toLocaleString('en-US'),
  formatAxis = value => formatCompactNumber(value),
  showLegend = false,
}: LineChartOptionInput): EChartsCoreOption {
  return {
    animationDuration: 720,
    animationEasing: 'cubicOut',
    textStyle: baseTextStyle(colors),
    grid: baseGrid(showLegend),
    legend: showLegend
      ? {
          top: 0,
          right: 0,
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 14,
          icon: 'roundRect',
          textStyle: { color: colors.muted, fontSize: 10, fontFamily: colors.fontFamily },
        }
      : undefined,
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: withAlpha(colors.text, 0.2), width: 1, type: [4, 4] },
      },
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params];
        const first = rows[0] as { axisValueLabel?: string; name?: string };
        const title = first?.axisValueLabel ?? first?.name ?? '';
        const body = rows
          .map(param => {
            const item = param as {
              seriesName?: string;
              value?: number | null;
              color?: string;
            };

            if (item.value == null) {
              return '';
            }

            return tooltipRow(
              item.color ?? colors.accent,
              item.seriesName ?? '',
              formatValue(Number(item.value)),
            );
          })
          .join('');

        return tooltipShell(colors, String(title), body);
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        margin: 10,
        hideOverlap: true,
        fontFamily: colors.fontFamily,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        margin: 8,
        formatter: (value: number) => formatAxis(value),
        fontFamily: colors.fontFamily,
      },
      splitLine: {
        show: true,
        lineStyle: { color: colors.grid, type: [3, 4], width: 1 },
      },
    },
    series: series.map(item => ({
      name: item.label,
      type: 'line',
      data: item.data,
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: true,
      z: item.dashed ? 2 : 3,
      lineStyle: {
        color: item.color,
        width: item.dashed ? 1.5 : 2,
        type: item.dashed ? [5, 5] : 'solid',
        shadowBlur: item.dashed ? 0 : 12,
        shadowColor: withAlpha(item.color, 0.38),
      },
      itemStyle: { color: item.color, borderColor: colors.surface, borderWidth: 2 },
      emphasis: { focus: 'series', scale: 1.4 },
      areaStyle:
        item.area === false
          ? undefined
          : {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: withAlpha(item.color, item.dashed ? 0.08 : 0.24) },
                  { offset: 1, color: withAlpha(item.color, 0) },
                ],
              },
            },
    })),
  } as EChartsCoreOption;
}

export interface ComposedRow {
  label: string;
  bar: number;
  line: number;
}

export interface ComposedChartOptionInput {
  rows: ComposedRow[];
  colors: ChartColors;
  barLabel: string;
  lineLabel: string;
  barColor?: string;
  lineColor?: string;
  formatBar?: TooltipFormatter;
  formatLine?: TooltipFormatter;
  formatAxis?: AxisFormatter;
  lineAxis?: 'left' | 'right';
  /** Optional per-bar palette; bars cycle through it instead of one gradient. */
  barColors?: string[];
}

export function buildComposedChartOption({
  rows,
  colors,
  barLabel,
  lineLabel,
  barColor,
  lineColor,
  formatBar = value => value.toLocaleString('en-US'),
  formatLine = value => value.toLocaleString('en-US'),
  formatAxis = value => formatCompactNumber(value),
  lineAxis = 'left',
  barColors,
}: ComposedChartOptionInput): EChartsCoreOption {
  const bar = barColor ?? colors.accent;
  const line = lineColor ?? colors.accentAlt;
  const hasRightAxis = lineAxis === 'right';

  return {
    animationDuration: 760,
    animationEasing: 'cubicOut',
    textStyle: baseTextStyle(colors),
    grid: { ...baseGrid(true), right: hasRightAxis ? 4 : 8 },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 14,
      icon: 'roundRect',
      textStyle: { color: colors.muted, fontSize: 10, fontFamily: colors.fontFamily },
    },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: withAlpha(colors.text, 0.04) },
      },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const first = items[0] as { axisValueLabel?: string; name?: string };
        const title = first?.axisValueLabel ?? first?.name ?? '';
        const body = items
          .map((param, index) => {
            const item = param as { seriesName?: string; value?: number | null; color?: string };

            if (item.value == null) {
              return '';
            }

            const isLine = index === items.length - 1;

            return tooltipRow(
              item.color ?? (isLine ? line : bar),
              item.seriesName ?? '',
              isLine ? formatLine(Number(item.value)) : formatBar(Number(item.value)),
            );
          })
          .join('');

        return tooltipShell(colors, String(title), body);
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map(row => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.muted,
        fontSize: 10,
        margin: 10,
        hideOverlap: true,
        fontFamily: colors.fontFamily,
      },
      splitLine: { show: false },
    },
    yAxis: hasRightAxis
      ? [
          {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: colors.muted,
              fontSize: 10,
              margin: 8,
              formatter: (value: number) => formatAxis(value),
              fontFamily: colors.fontFamily,
            },
            splitLine: { show: true, lineStyle: { color: colors.grid, type: [3, 4], width: 1 } },
          },
          {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: colors.muted,
              fontSize: 10,
              margin: 8,
              formatter: (value: number) => formatAxis(value),
              fontFamily: colors.fontFamily,
            },
            splitLine: { show: false },
          },
        ]
      : {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: colors.muted,
            fontSize: 10,
            margin: 8,
            formatter: (value: number) => formatAxis(value),
            fontFamily: colors.fontFamily,
          },
          splitLine: { show: true, lineStyle: { color: colors.grid, type: [3, 4], width: 1 } },
        },
    series: [
      {
        name: barLabel,
        type: 'bar',
        data: rows.map((row, index) =>
          barColors?.length
            ? {
                value: row.bar,
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: withAlpha(barColors[index % barColors.length], 0.95) },
                      { offset: 1, color: withAlpha(barColors[index % barColors.length], 0.3) },
                    ],
                  },
                },
              }
            : row.bar,
        ),
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(bar, 0.95) },
              { offset: 1, color: withAlpha(bar, 0.28) },
            ],
          },
        },
        emphasis: { itemStyle: { color: withAlpha(bar, 1) } },
      },
      {
        name: lineLabel,
        type: 'line',
        yAxisIndex: hasRightAxis ? 1 : 0,
        data: rows.map(row => row.line),
        smooth: 0.35,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 7,
        z: 4,
        lineStyle: {
          color: line,
          width: 2,
          shadowBlur: 14,
          shadowColor: withAlpha(line, 0.42),
        },
        itemStyle: { color: line, borderColor: colors.surface, borderWidth: 2 },
        emphasis: { focus: 'series', scale: 1.4 },
      },
    ],
  } as EChartsCoreOption;
}

export interface SankeyNodeInput {
  name: string;
  label?: string;
  color?: string;
}

export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
}

export interface SankeyChartOptionInput {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  colors: ChartColors;
  formatValue?: TooltipFormatter;
  /** Horizontal room reserved for the outside node labels. */
  labelPadding?: number;
}

const SANKEY_PALETTE = ['#a63a60', '#3b82f6', '#8b5cf6', '#0f8a5f', '#d97706', '#0891b2'];

export function buildSankeyChartOption({
  nodes,
  links,
  colors,
  formatValue = value => value.toLocaleString('en-US'),
  labelPadding = 120,
}: SankeyChartOptionInput): EChartsCoreOption {
  const colorByName = new Map<string, string>();
  const labelByName = new Map<string, string>();

  nodes.forEach((node, index) => {
    colorByName.set(node.name, node.color ?? SANKEY_PALETTE[index % SANKEY_PALETTE.length]);
    labelByName.set(node.name, node.label ?? node.name);
  });

  const totals = new Map<string, number>();
  const sources = new Set(links.map(link => link.source));
  const targets = new Set(links.map(link => link.target));

  for (const node of nodes) {
    totals.set(node.name, 0);
  }

  links.forEach(link => {
    totals.set(link.source, (totals.get(link.source) ?? 0) + link.value);
    if (!totals.has(link.target)) {
      totals.set(link.target, 0);
    }
  });

  // A sink node has no outgoing flow; show the incoming total instead.
  nodes.forEach(node => {
    if ((totals.get(node.name) ?? 0) === 0) {
      const incoming = links
        .filter(link => link.target === node.name)
        .reduce((sum, link) => sum + link.value, 0);

      totals.set(node.name, incoming);
    }
  });

  return {
    animationDuration: 760,
    animationEasing: 'cubicOut',
    textStyle: baseTextStyle(colors),
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as {
          dataType?: string;
          name?: string;
          data?: { source?: string; target?: string; value?: number };
        };

        if (item.dataType === 'edge') {
          const source = String(item.data?.source ?? '');
          const target = String(item.data?.target ?? '');
          const value = Number(item.data?.value ?? 0);

          return tooltipShell(
            colors,
            `${labelByName.get(source) ?? source} → ${labelByName.get(target) ?? target}`,
            tooltipRow(
              colorByName.get(source) ?? colors.accent,
              formatValue(value),
              formatPercent(value, totals.get(source) ?? value),
            ),
          );
        }

        const name = String(item.name ?? '');

        return tooltipShell(
          colors,
          labelByName.get(name) ?? name,
          tooltipRow(
            colorByName.get(name) ?? colors.accent,
            formatValue(totals.get(name) ?? 0),
            '',
          ),
        );
      },
    },
    series: [
      {
        type: 'sankey',
        left: labelPadding,
        right: labelPadding + 12,
        top: 12,
        bottom: 12,
        nodeWidth: 11,
        nodeGap: 12,
        layoutIterations: 32,
        nodeAlign: 'justify',
        draggable: false,
        emphasis: { focus: 'adjacency' },
        lineStyle: { curveness: 0.5, opacity: 0.45 },
        label: {
          show: true,
          position: 'right',
          backgroundColor: withAlpha(colors.surface, 0.86),
          borderRadius: 4,
          padding: [2, 4],
          width: Math.max(72, labelPadding - 8),
          overflow: 'truncate',
          formatter: (params: unknown) => {
            const name = String((params as { name?: string }).name ?? '');

            return `{name|${labelByName.get(name) ?? name}}\n{value|${formatValue(
              totals.get(name) ?? 0,
            )}}`;
          },
          rich: {
            name: {
              color: colors.text,
              fontSize: 10.5,
              fontWeight: 500,
              lineHeight: 15,
              fontFamily: colors.fontFamily,
            },
            value: {
              color: colors.muted,
              fontSize: 9.5,
              lineHeight: 13,
              fontFamily: colors.fontFamily,
            },
          },
        },
        data: nodes.map(node => {
          const hasIncoming = targets.has(node.name);
          const hasOutgoing = sources.has(node.name);
          // Root nodes read outside on the left; every downstream node reads
          // outside on the right. The label plate keeps the text legible where
          // it crosses a band.
          const position = hasOutgoing && !hasIncoming ? 'left' : 'right';

          return {
            name: node.name,
            itemStyle: {
              color: colorByName.get(node.name),
              borderWidth: 0,
              borderRadius: 3,
            },
            label: {
              position,
              align: position === 'left' ? 'right' : 'left',
              verticalAlign: 'middle',
            },
          };
        }),
        links: links.map(link => ({
          source: link.source,
          target: link.target,
          value: link.value,
          lineStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: withAlpha(colorByName.get(link.source) ?? colors.accent, 0.5) },
                {
                  offset: 1,
                  color: withAlpha(colorByName.get(link.target) ?? colors.accentAlt, 0.16),
                },
              ],
            },
          },
        })),
      },
    ],
  } as EChartsCoreOption;
}

/** Small local helper: the share of a source node's total, shown on edges. */
function formatPercent(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return '';
  }

  return `${Math.round((value / total) * 100)}%`;
}
