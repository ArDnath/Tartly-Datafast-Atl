'use client';

import { useMemo } from 'react';
import { type ChartColors, formatCompactNumber } from './colors';
import { EChart, useChartColors } from './EChart';
import { buildLineChartOption, type LineChartOptionInput, type LineSeriesInput } from './options';

export interface LineTrendChartProps {
  labels: string[];
  series: LineSeriesInput[];
  height?: number | string;
  className?: string;
  colors?: Partial<ChartColors>;
  formatValue?: LineChartOptionInput['formatValue'];
  formatAxis?: LineChartOptionInput['formatAxis'];
  showLegend?: boolean;
  ariaLabel: string;
}

/**
 * The EvilCharts "line blocks" look: smooth strokes with a soft glow, a
 * gradient wash under the primary line, a quiet dashed grid, and a frosted
 * hover card. Values are supplied by the caller so the same surface serves the
 * marketing preview and the real dashboard.
 */
export function LineTrendChart({
  labels,
  series,
  height = 220,
  className,
  colors: override,
  formatValue,
  formatAxis,
  showLegend,
  ariaLabel,
}: LineTrendChartProps) {
  const colors = useChartColors(override);
  const option = useMemo(
    () =>
      buildLineChartOption({
        labels,
        series,
        colors,
        formatValue,
        formatAxis: formatAxis ?? (value => formatCompactNumber(value)),
        showLegend,
      }),
    [colors, formatAxis, formatValue, labels, series, showLegend],
  );

  return <EChart option={option} height={height} className={className} ariaLabel={ariaLabel} />;
}
