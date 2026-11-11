'use client';

import { useMemo } from 'react';
import type { ChartColors } from './colors';
import { EChart, useChartColors } from './EChart';
import {
  buildSankeyChartOption,
  type SankeyChartOptionInput,
  type SankeyLinkInput,
  type SankeyNodeInput,
} from './options';

export interface SankeyFlowChartProps {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  height?: number | string;
  className?: string;
  colors?: Partial<ChartColors>;
  formatValue?: SankeyChartOptionInput['formatValue'];
  labelPadding?: number;
  ariaLabel: string;
}

/**
 * The EvilCharts sankey block: column-aligned nodes, outside labels with the
 * node total, and translucent source-tinted bands. Used for acquisition and
 * conversion flows, never for multi-tenant data.
 */
export function SankeyFlowChart({
  nodes,
  links,
  height = 260,
  className,
  colors: override,
  formatValue,
  labelPadding,
  ariaLabel,
}: SankeyFlowChartProps) {
  const colors = useChartColors(override);
  const option = useMemo(
    () => buildSankeyChartOption({ nodes, links, colors, formatValue, labelPadding }),
    [colors, formatValue, labelPadding, links, nodes],
  );

  return <EChart option={option} height={height} className={className} ariaLabel={ariaLabel} />;
}
