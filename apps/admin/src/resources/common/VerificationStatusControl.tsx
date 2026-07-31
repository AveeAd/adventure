import { useCustomMutation, useInvalidate } from '@refinedev/core';
import { Button, Select, Space, message } from 'antd';
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
