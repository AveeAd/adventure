import { useCustom, useCustomMutation } from '@refinedev/core';
import { Button, Card, Input, Space, Table, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SystemSettingRow {
  key: string;
  value: string;
  description: string;
}

// Key prefix -> section, so the settings table reads as labeled groups
// instead of one flat list mixing approval/points/branding keys together.
// Falls back to "other" for any future prefix not listed here.
const SECTION_FOR_PREFIX: Record<string, string> = {
  approval: 'moderation',
  moderator: 'moderation',
  reports: 'moderation',
  points: 'points',
  app: 'app',
};
const SECTION_ORDER = ['moderation', 'points', 'app', 'other'];

function sectionOf(key: string): string {
  return SECTION_FOR_PREFIX[key.split('.')[0]] ?? 'other';
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

  const columns = [
    { title: t('system-settings.fields.key'), dataIndex: 'key', width: 220 },
    { title: t('system-settings.fields.description'), dataIndex: 'description' },
    {
      title: t('system-settings.fields.value'),
      width: 360,
      render: (_: unknown, row: SystemSettingRow) => <SettingValueEditor row={row} onSaved={() => refetch()} />,
    },
  ];

  return (
    <Card title={t('system-settings.title')}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {SECTION_ORDER.map((section) => {
          const sectionRows = rows.filter((row) => sectionOf(row.key) === section);
          if (sectionRows.length === 0) return null;
          return (
            <div key={section}>
              <Typography.Title level={5}>{t(`system-settings.sections.${section}`)}</Typography.Title>
              <Table<SystemSettingRow>
                rowKey="key"
                loading={query.isLoading}
                dataSource={sectionRows}
                pagination={false}
                columns={columns}
              />
            </div>
          );
        })}
      </Space>
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Input style={{ flex: 1, minWidth: 0 }} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="small" type="primary" disabled={!dirty} loading={mutation.isPending} onClick={save}>
        {t('system-settings.save')}
      </Button>
    </div>
  );
}
