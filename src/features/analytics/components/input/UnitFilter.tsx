import { ListItem, Row, Select } from '@talivia/react-zen';
import { useMessages, useUrlState } from '@/components/hooks/index';
import { DEFAULT_DATE_RANGE_VALUE } from '@/lib/constants';
import { useApp } from '@/store/app';

const dateRangeSelector = (state: { dateRangeValue: string }) => state.dateRangeValue;

export function UnitFilter() {
  const { t, labels } = useMessages();
  const { query, patch } = useUrlState();
  const storedDateRange = useApp(dateRangeSelector);

  const DATE_RANGE_UNIT_CONFIG = {
    '0day': {
      defaultUnit: 'hour',
      availableUnits: ['hour'],
    },
    '24hour': {
      defaultUnit: 'hour',
      availableUnits: ['hour'],
    },
    '0week': {
      defaultUnit: 'day',
      availableUnits: ['day', 'hour'],
    },
    '7day': {
      defaultUnit: 'day',
      availableUnits: ['day', 'hour'],
    },
    '0month': {
      defaultUnit: 'day',
      availableUnits: ['day', 'hour'],
    },
    '30day': {
      defaultUnit: 'day',
      availableUnits: ['day', 'hour'],
    },
    '90day': {
      defaultUnit: 'day',
      availableUnits: ['day', 'month'],
    },
    '6month': {
      defaultUnit: 'month',
      availableUnits: ['month', 'day'],
    },
  };

  const unitConfig =
    DATE_RANGE_UNIT_CONFIG[query.date || storedDateRange || DEFAULT_DATE_RANGE_VALUE];

  if (!unitConfig) {
    return null;
  }

  const handleChange = (value: string) => {
    patch({ unit: value, page: undefined });
  };

  const options = unitConfig.availableUnits.map(unit => ({
    id: unit,
    label: t(labels[unit]),
  }));

  const selectedUnit = query.unit ?? unitConfig.defaultUnit;

  return (
    <Row>
      <Select
        value={selectedUnit}
        onChange={handleChange}
        buttonProps={{ className: 'talivia-control' }}
        popoverProps={{ className: 'talivia-popover', placement: 'bottom right' }}
        style={{ width: 100 }}
      >
        {options.map(({ id, label }) => (
          <ListItem key={id} id={id}>
            {label}
          </ListItem>
        ))}
      </Select>
    </Row>
  );
}
