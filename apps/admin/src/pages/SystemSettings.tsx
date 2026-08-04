import { useCustom, useCustomMutation } from '@refinedev/core';
import { Button, Card, Input, Space, Table, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SystemSettingRow {
  key: string;
  value: string;
  description: string;
}

// MILESTONE_3.md §6/§9.2: "System settings" admin resource over
// SettingsService's key/value store - approval thresholds, minimum guide
// levels, and every §3.1 point value. Admin-only (see the API controller's
// @Roles(Role.ADMIN) - moderators are explicitly excluded per §2.1), so
// this page never needs to branch on the viewer's role.
export function SystemSettingsPage() {
  const { t } = useTranslation('resources');
  const { result, query, refetch } = useCustom<{ data: SystemSettingRow[] } | SystemSettingRow[]>({
    url: '/settings',
    method: 'get',
  });
  // API returns a bare array (list(), not the { data, total } list envelope
  // other resources use - settings aren't paginated).
  const rows = Array.isArray(result?.data) ? result.data : (result?.data?.data ?? []);

  return (
    <Card title={t('system-settings.title')}>
      <Table<SystemSettingRow>
        rowKey="key"
        loading={query.isLoading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: t('system-settings.fields.key'), dataIndex: 'key' },
          { title: t('system-settings.fields.description'), dataIndex: 'description' },
          {
            title: t('system-settings.fields.value'),
            render: (_, row) => <SettingValueEditor row={row} onSaved={() => refetch()} />,
          },
        ]}
      />
    </Card>
  );
}

function SettingValueEditor({ row, onSaved }: { row: SystemSettingRow; onSaved: () => void }) {
  const { t } = useTranslation('resources');
  const [value, setValue] = useState(row.value);
  const { mutate, mutation } = useCustomMutation();

  useEffect(() => setValue(row.value), [row.value]);

  const dirty = value !== row.value;

  const save = () => {
    mutate(
      { url: `/settings/${row.key}`, method: 'patch', values: { value } },
      {
        onSuccess: () => {
          message.success(t('system-settings.saved'));
          onSaved();
        },
        onError: () => message.error(t('system-settings.saveError')),
      },
    );
  };

  return (
    <Space>
      <Input style={{ width: 140 }} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="small" type="primary" disabled={!dirty} loading={mutation.isPending} onClick={save}>
        {t('system-settings.save')}
      </Button>
    </Space>
  );
}
