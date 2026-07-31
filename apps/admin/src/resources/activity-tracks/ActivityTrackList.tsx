import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/format';

const SOURCE_COLOR: Record<string, string> = { RECORDED: 'blue', IMPORTED: 'purple' };
const VISIBILITY_COLOR: Record<string, string> = { PUBLIC: 'green', PRIVATE: 'default' };

// Read + moderate only, per CLAUDE.md's admin convention - no authoring,
// list/show + delete for abuse (e.g. a track mislabeled to spam a page's
// contribution feed). See ACTIVITY_TRACKS.md's Admin section.
export const ActivityTrackList = () => {
  const { tableProps } = useTable({ resource: 'activity-tracks', syncWithLocation: true });
  const { t } = useTranslation('resources');

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="name"
          title={t('activity-tracks.fields.name')}
          render={(name: string | null) => name ?? t('activity-tracks.defaultName')}
        />
        <Table.Column dataIndex="userEmail" title={t('activity-tracks.fields.owner')} />
        <Table.Column
          dataIndex="distanceMeters"
          title={t('activity-tracks.fields.distance')}
          render={(value: number) => `${(value / 1000).toFixed(1)} km`}
        />
        <Table.Column
          dataIndex="source"
          title={t('activity-tracks.fields.source')}
          render={(source: string) => <Tag color={SOURCE_COLOR[source]}>{source}</Tag>}
        />
        <Table.Column
          dataIndex="visibility"
          title={t('activity-tracks.fields.visibility')}
          render={(visibility: string) => <Tag color={VISIBILITY_COLOR[visibility]}>{visibility}</Tag>}
        />
        <Table.Column
          dataIndex="startedAt"
          title={t('activity-tracks.fields.started')}
          render={(value: string) => formatDate(value)}
        />
        <Table.Column
          title={t('fields.actions')}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <ShowButton resource="activity-tracks" recordItemId={record.id} size="small" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
