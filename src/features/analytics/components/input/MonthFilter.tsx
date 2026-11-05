import { useDateRange, useUrlState } from '@/components/hooks/index';
import { MonthSelect } from '@/features/analytics/components/input/MonthSelect';
import { getMonthDateRangeValue } from '@/lib/date';

export function MonthFilter() {
  const { patch } = useUrlState();
  const {
    dateRange: { startDate },
  } = useDateRange();

  const handleMonthSelect = (date: Date) => {
    const range = getMonthDateRangeValue(date);

    patch({ date: range, offset: undefined, page: undefined });
  };

  return <MonthSelect date={startDate} onChange={handleMonthSelect} />;
}
