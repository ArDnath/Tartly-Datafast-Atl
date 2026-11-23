import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setOption = vi.fn();
const init = vi.fn(() => ({ setOption, resize: vi.fn(), dispose: vi.fn() }));

vi.mock('echarts/core', () => ({ init, use: vi.fn() }));
vi.mock('echarts/charts', () => ({
  BarChart: {},
  LineChart: {},
  SankeyChart: {},
}));
vi.mock('echarts/components', () => ({
  GridComponent: {},
  LegendComponent: {},
  TooltipComponent: {},
}));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));

import { EChart } from './EChart';

describe('EChart', () => {
  beforeEach(() => {
    setOption.mockClear();
    init.mockClear();
    // The real component skips ECharts when jsdom cannot provide a 2D context.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
  });

  it('applies option updates synchronously so tooltips never read a series without data', async () => {
    // `lazyUpdate` swaps series models one frame before their data exists. A
    // pointer in that gap makes ECharts call getRawIndex on undefined and crash
    // the landing page preview, so the update must stay synchronous.
    const { container, rerender } = render(
      <EChart option={{ series: [] }} ariaLabel="Revenue chart" />,
    );

    await waitFor(() =>
      expect(container.querySelector('[data-echart-ready="true"]')).toBeInTheDocument(),
    );

    rerender(
      <EChart option={{ series: [{ type: 'bar', data: [1, 2] }] }} ariaLabel="Revenue chart" />,
    );

    await waitFor(() => expect(setOption).toHaveBeenCalledTimes(2));

    const updateOptions = setOption.mock.calls[1][1];

    expect(updateOptions).toEqual({ notMerge: true });
    expect(updateOptions).not.toHaveProperty('lazyUpdate');
  });
});
