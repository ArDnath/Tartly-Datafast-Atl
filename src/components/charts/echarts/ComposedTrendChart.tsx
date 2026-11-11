'use client';

import { useMemo } from 'react';
import { type ChartColors, formatCompactNumber } from './colors';
import { EChart, useChartColors } from './EChart';
import {
  buildComposedChartOption,
  type ComposedChartOptionInput,
  type ComposedRow,
} from './options';

export interface ComposedTrendChartProps {
  rows: ComposedRow[];
  barLabel: string;
  lineLabel: string;
  height?: number | string;
  className?: string;
  colors?: Partial<ChartColors>;
  barColor?: string;
  lineColor?: string;
  formatBar?: ComposedChartOptionInput['formatBar'];
  formatLine?: ComposedChartOptionInput['formatLine'];
  formatAxis?: ComposedChartOptionInput['formatAxis'];
  lineAxis?: ComposedChartOptionInput['lineAxis'];
  barColors?: string[];
  ariaLabel: string;
}

/**
 * The EvilCharts composed block: rounded revenue columns with a vertical fade,
 * and a glowing line brought forward over them. The line can ride a second
 * value axis when the two metrics count different things (money vs. events).
 */
export function ComposedTrendChart({
  rows,
  barLabel,
  lineLabel,
  height = 240,
  className,
  colors: override,
  barColor,
  lineColor,
  formatBar,
  formatLine,
  formatAxis,
  lineAxis = 'right',
  barColors,
  ariaLabel,
}: ComposedTrendChartProps) {
  const colors = useChartColors(override);
  const option = useMemo(
    () =>
      buildComposedChartOption({
        rows,
        colors,
        barLabel,
        lineLabel,
        barColor,
        lineColor,
        formatBar,
        formatLine,
        formatAxis: formatAxis ?? (value => formatCompactNumber(value)),
        lineAxis,
        barColors,
      }),
    [
      barColor,
      barColors,
      barLabel,
      colors,
      formatAxis,
      formatBar,
      formatLine,
      lineAxis,
      lineLabel,
      rows,
    ],
  );

  return <EChart option={option} height={height} className={className} ariaLabel={ariaLabel} />;
}
