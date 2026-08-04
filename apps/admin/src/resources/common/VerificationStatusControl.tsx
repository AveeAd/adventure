import { useCan, useCustomMutation, useInvalidate } from '@refinedev/core';
import { Button, Select, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const VerificationStatusControl = ({
  resource,
  id,
  status,
  options,
}: {
  resource: string;
  id: string;
  status: string;
  options: string[];
}) => {
  const [value, setValue] = useState(status);
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();
  const { t } = useTranslation(['resources', 'common']);
  // MILESTONE_3.md §2.1: only guide-profiles' verification-status endpoint
  // is admin-only (the restricted-district licence gate) - trails/spots/
  // pages allow moderators, so this is a no-op there (accessControlProvider
  // only restricts the 'guide-profiles' + 'verify' pair).
  const { data: access } = useCan({ resource, action: 'verify' });

  useEffect(() => setValue(status), [status]);

  const save = () => {
    mutate(
      {
        url: `/${resource}/${id}/verification-status`,
        method: 'patch',
        values: { status: value },
      },
      {
        onSuccess: () => {
          message.success(t('verification.updated'));
          invalidate({ resource, invalidates: ['detail', 'list'], id });
        },
      },
    );
  };

  if (access?.can === false) {
    return (
      <Space>
        <Select value={value} disabled style={{ width: 220 }} options={options.map((option) => ({ value: option, label: option.replaceAll('_', ' ') }))} />
        <Typography.Text type="secondary">{t('verification.adminOnly')}</Typography.Text>
      </Space>
    );
  }

  return (
    <Space>
      <Select
        value={value}
        onChange={setValue}
        style={{ width: 220 }}
        options={options.map((option) => ({ value: option, label: option.replaceAll('_', ' ') }))}
      />
      <Button type="primary" onClick={save} disabled={value === status} loading={mutation.isPending}>
        {t('common:actions.save')}
      </Button>
    </Space>
  );
};
