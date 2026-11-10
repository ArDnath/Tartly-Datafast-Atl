'use client';

import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHART_SECONDARY,
  type ChartColors,
  FALLBACK_CHART_COLORS,
  readChartColors,
} from './colors';

let echartsPromise: Promise<typeof import('echarts/core')> | null = null;

/**
 * Loads the ECharts modules the charts actually use. Keeping the import inside
 * a client effect means the server render (and the marketing bundle) never
 * evaluates a canvas library, and the registrations are idempotent.
 */
export function loadECharts() {
  if (!echartsPromise) {
    echartsPromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.BarChart,
        charts.LineChart,
        charts.SankeyChart,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ]);

      return core;
    });
  }

  return echartsPromise;
}

/** Tracks the live theme tokens and merges any per-surface overrides. */
export function useChartColors(override?: Partial<ChartColors>): ChartColors {
  const [base, setBase] = useState<ChartColors>(FALLBACK_CHART_COLORS);

  useEffect(() => {
    const read = () => setBase(readChartColors(document.documentElement));

    read();

    const observer = new MutationObserver(read);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    return () => observer.disconnect();
  }, []);

  return useMemo(
    () => ({ ...base, ...override, accentAlt: override?.accentAlt ?? CHART_SECONDARY }),
    [base, override],
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * ECharts needs a real 2D context. jsdom (the unit-test environment) returns
 * `null` from `getContext`, so the chart stays an empty labelled surface there
 * instead of throwing from zrender's next animation frame.
 */
function supportsCanvas() {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    return Boolean(document.createElement('canvas').getContext('2d'));
  } catch {
    return false;
  }
}

function applyMotionPreference(option: EChartsCoreOption): EChartsCoreOption {
  return {
    ...option,
    animation: option.animation !== false && !prefersReducedMotion(),
  } as EChartsCoreOption;
}

export interface EChartProps {
  option: EChartsCoreOption;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Concise text equivalent for screen readers; the canvas itself is opaque. */
  ariaLabel: string;
}

/**
 * One imperative ECharts instance behind a declarative option prop.
 *
 * `notMerge` keeps option swaps cheap and predictable (the old series never
 * linger when a filter removes a key). The instance is created lazily, resized
 * with its container, and disposed on unmount.
 */
export function EChart({ option, height = 220, className, style, ariaLabel }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const optionRef = useRef(option);
  const [isReady, setIsReady] = useState(false);

  optionRef.current = option;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    if (!supportsCanvas()) {
      return;
    }

    loadECharts()
      .then(echarts => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });

        chartRef.current = chart;
        chart.setOption(applyMotionPreference(optionRef.current));
        resizeObserver = new ResizeObserver(() => chart.resize());
        resizeObserver.observe(containerRef.current);
        setIsReady(true);
      })
      .catch(() => {
        // A failed chunk load leaves the labelled surface in place; the page
        // around it keeps working instead of surfacing an unhandled rejection.
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Respect the OS setting on every rebuild; ECharts has no central switch.
    chartRef.current?.setOption(applyMotionPreference(option), {
      notMerge: true,
      lazyUpdate: true,
    });
  }, [option]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
      data-echart-ready={isReady ? 'true' : 'false'}
      style={{ width: '100%', height, ...style }}
    />
  );
}
