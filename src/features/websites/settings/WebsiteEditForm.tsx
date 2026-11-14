import {
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Row,
  Switch,
  Text,
  TextField,
} from '@talivia/react-zen';
import { type ReactNode, useEffect, useState } from 'react';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { useWebsite } from '@/features/websites/hooks/useWebsite';
import { normalizeWebsiteDomainInput } from '@/features/websites/lib/website-domain';
import { DOMAIN_REGEX } from '@/lib/constants';

export function WebsiteEditForm({
  websiteId,
  onSave,
  showId = true,
  showName = true,
  submitLabel,
}: {
  websiteId: string;
  onSave?: () => void;
  showId?: boolean;
  showName?: boolean;
  submitLabel?: ReactNode;
}) {
  const website = useWebsite();
  const { t, labels, messages, getErrorMessage } = useMessages();
  const { mutateAsync, error, touch, toast } = useUpdateQuery(`/websites/${websiteId}`);
  const [replayEnabled, setReplayEnabled] = useState(Boolean(website?.replayEnabled));

  useEffect(() => {
    setReplayEnabled(Boolean(website?.replayEnabled));
  }, [website?.replayEnabled]);

  const handleSubmit = async (data: any) => {
    await mutateAsync(
      {
        name: data.name,
        domain: normalizeWebsiteDomainInput(data.domain),
        replayEnabled,
      },
      {
        onSuccess: async () => {
          toast(t(messages.saved));
          touch('websites');
          touch(`website:${website.id}`);
          onSave?.();
        },
      },
    );
  };

  return (
    <Form onSubmit={handleSubmit} error={getErrorMessage(error)} values={website}>
      {showId && (
        <FormField name="id" label={t(labels.websiteId)}>
          <TextField data-test="text-field-websiteId" value={website?.id} isReadOnly allowCopy />
        </FormField>
      )}
      {showName && (
        <FormField label={`${t(labels.name)} (optional)`} data-test="input-name" name="name">
          <TextField />
        </FormField>
      )}
      <FormField
        label={t(labels.domain)}
        data-test="input-domain"
        name="domain"
        rules={{
          required: t(labels.required),
          pattern: {
            value: DOMAIN_REGEX,
            message: t(messages.invalidDomain),
          },
        }}
      >
        <TextField />
      </FormField>
      <Row alignItems="center" gap="2" style={{ flexWrap: 'wrap' }}>
        <Switch isSelected={replayEnabled} onChange={setReplayEnabled}>
          Session replay
        </Switch>
        <Text color="muted">
          Pro plan. Records masked sessions after the tracker loads; inputs are masked by default.
        </Text>
      </Row>
      <FormButtons>
        <FormSubmitButton data-test="button-submit" variant="primary">
          {submitLabel || t(labels.save)}
        </FormSubmitButton>
      </FormButtons>
    </Form>
  );
}
