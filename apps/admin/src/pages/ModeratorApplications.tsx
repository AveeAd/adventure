import { useCustom, useCustomMutation } from '@refinedev/core';
import { Button, Card, Empty, Input, Select, Space, Table, Tag, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserRef } from '../components/UserRef';
import { formatDateTime } from '../lib/format';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ModeratorApplicationRow {
  id: string;
  userId: string;
  statement: string;
  status: ApplicationStatus;
  createdAt: string;
  user: { profile: { name: string | null } | null; guideProfile: { guideLevel: number } | null };
}

// MILESTONE_3.md §7/§9.2: "Moderator applications" admin resource - "Only
// ADMIN reviews", mirroring ReportsPage's workflow-action shape (a decide
// action, not a field edit) rather than generic CRUD.
export function ModeratorApplicationsPage() {
  const { t } = useTranslation('resources');
  const [status, setStatus] = useState<ApplicationStatus>('PENDING');

  const { result, query } = useCustom<{ data: ModeratorApplicationRow[] }>({
    url: '/moderator-applications',
    method: 'get',
    config: { query: { status, pageSize: 100 } },
  });
  const rows = result?.data?.data ?? [];

  return (
    <Card title={t('moderator-applications.title')}>
      <Space style={{ marginBottom: 16 }}>
        <Select<ApplicationStatus>
          style={{ width: 200 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: 'PENDING', label: t('moderator-applications.status.PENDING') },
            { value: 'APPROVED', label: t('moderator-applications.status.APPROVED') },
            { value: 'REJECTED', label: t('moderator-applications.status.REJECTED') },
          ]}
        />
      </Space>

      {rows.length === 0 && !query.isLoading ? (
        <Empty description={t('moderator-applications.empty')} />
      ) : (
        <Table<ModeratorApplicationRow>
          rowKey="id"
          loading={query.isLoading}
          dataSource={rows}
          pagination={false}
          columns={[
            {
              title: t('moderator-applications.fields.applicant'),
              render: (_, row) => <UserRef userId={row.userId} />,
            },
            {
              title: t('moderator-applications.fields.level'),
              render: (_, row) => row.user.guideProfile?.guideLevel ?? '—',
            },
            { title: t('moderator-applications.fields.statement'), dataIndex: 'statement' },
            {
              title: t('moderator-applications.fields.submitted'),
              dataIndex: 'createdAt',
              render: (value: string) => formatDateTime(value),
            },
            {
              title: '',
              render: (_, row) =>
                row.status === 'PENDING' ? (
                  <DecideControls applicationId={row.id} onDecided={() => query.refetch()} />
                ) : (
                  <Tag color={row.status === 'APPROVED' ? 'green' : 'default'}>
                    {t(`moderator-applications.status.${row.status}`)}
                  </Tag>
                ),
            },
          ]}
        />
      )}
    </Card>
  );
}

function DecideControls({ applicationId, onDecided }: { applicationId: string; onDecided: () => void }) {
  const { t } = useTranslation('resources');
  const { mutate, mutation } = useCustomMutation();
  const [note, setNote] = useState('');

  const decide = (decision: 'APPROVED' | 'REJECTED') => {
    mutate(
      {
        url: `/moderator-applications/${applicationId}/decide`,
        method: 'patch',
        values: { decision, reviewNote: note || undefined },
      },
      {
        onSuccess: () => {
          message.success(t('moderator-applications.decided'));
          onDecided();
        },
        onError: () => message.error(t('moderator-applications.decideError')),
      },
    );
  };

  return (
    <Space direction="vertical">
      <Input
        placeholder={t('moderator-applications.notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: 200 }}
      />
      <Space>
        <Button type="primary" onClick={() => decide('APPROVED')} loading={mutation.isPending}>
          {t('moderator-applications.approve')}
        </Button>
        <Button danger onClick={() => decide('REJECTED')} loading={mutation.isPending}>
          {t('moderator-applications.reject')}
        </Button>
      </Space>
    </Space>
  );
}
