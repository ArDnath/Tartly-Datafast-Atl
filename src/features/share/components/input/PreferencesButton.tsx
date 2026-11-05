import { Button, Column, DialogTrigger, Icon, Label, Popover } from '@talivia/react-zen';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks/index';
import { Settings } from '@/components/icons';
import { DateRangeSetting } from '@/features/settings/preferences/DateRangeSetting';
import { TimezoneSetting } from '@/features/settings/preferences/TimezoneSetting';

export function PreferencesButton() {
  const { t, labels } = useMessages();

  return (
    <DialogTrigger>
      <Button className="talivia-control" variant="quiet">
        <Icon>
          <Settings />
        </Icon>
      </Button>
      <Popover className="talivia-popover" placement="bottom end">
        <Panel gap="3">
          <Column>
            <Label>{t(labels.timezone)}</Label>
            <TimezoneSetting />
          </Column>
          <Column>
            <Label>{t(labels.defaultDateRange)}</Label>
            <DateRangeSetting />
          </Column>
        </Panel>
      </Popover>
    </DialogTrigger>
  );
}
