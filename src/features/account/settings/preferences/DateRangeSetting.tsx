import { Button, Row } from '@talivia/react-zen';
import { useMessages, useStoredState } from '@/components/hooks';
import { DateFilter } from '@/components/input/DateFilter';
import { DATE_RANGE_CONFIG, DEFAULT_DATE_RANGE_VALUE } from '@/lib/constants';
import { setDateRangeValue } from '@/store/app';

export function DateRangeSetting() {
  const { t, labels } = useMessages();
  const [date, setDate] = useStoredState(DATE_RANGE_CONFIG, DEFAULT_DATE_RANGE_VALUE);

  const handleChange = (value: string) => {
    setDate(value);
    setDateRangeValue(value);
  };

  const handleReset = () => {
    setDate(DEFAULT_DATE_RANGE_VALUE);
    setDateRangeValue(DEFAULT_DATE_RANGE_VALUE);
  };

  return (
    <Row gap="3">
      <DateFilter
        value={date}
        onChange={handleChange}
        placement="bottom start"
        style={{ minWidth: '250px' }}
      />
      <Button onPress={handleReset}>{t(labels.reset)}</Button>
    </Row>
  );
}
