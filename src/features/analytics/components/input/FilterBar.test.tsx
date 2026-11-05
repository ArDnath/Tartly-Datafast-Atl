import { expect, test, vi } from 'vitest';
import { FilterBar } from '@/features/analytics/components/input/FilterBar';
import { render, screen } from '@/test/render';

vi.mock('@/features/analytics/workbench/segments/SegmentEditForm', () => ({
  SegmentEditForm: () => <button type="button">Save</button>,
}));

vi.mock('@/components/hooks', () => ({
  useFilters: () => ({
    filters: [
      {
        label: 'Browser',
        name: 'browser',
        operator: 'eq',
        type: 'browser',
        value: 'Opera',
      },
    ],
    operatorLabels: { eq: 'is' },
  }),
  useFormat: () => ({ formatValue: (value: string) => value }),
  useMessages: () => ({
    labels: {
      clearAll: 'Clear all',
      saveSegment: 'Save filter',
      segment: 'Segment',
    },
    t: (value: string) => value,
  }),
  useUrlState: () => ({
    patch: vi.fn(),
    pathname: '/app/website-id',
    query: {},
  }),
}));

vi.mock('@/features/analytics/hooks/useWebsiteSegmentQuery', () => ({
  useWebsiteSegmentQuery: () => ({ data: undefined, isLoading: false }),
}));

test('keeps the save-filter dialog within the viewport and scrollable', async () => {
  const { user } = render(<FilterBar websiteId="website-id" />);

  await user.click(screen.getByRole('button', { name: 'Save filter' }));

  expect(await screen.findByRole('dialog')).toHaveStyle({
    maxHeight: 'calc(100dvh - 40px)',
    overflowY: 'auto',
  });
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
});
