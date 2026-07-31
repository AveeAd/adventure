import { List, ShowButton, useTable } from '@refinedev/antd';
import type { BaseRecord } from '@refinedev/core';
import { Space, Table, Tag } from 'antd';

const SOURCE_COLOR: Record<string, string> = { RECORDED: 'blue', IMPORTED: 'purple' };
const VISIBILITY_COLOR: Record<string, string> = { PUBLIC: 'green', PRIVATE: 'default' };

// Read + moderate only, per CLAUDE.md's admin convention - no authoring,
// list/show + delete for abuse (e.g. a track mislabeled to spam a page's
// contribution feed). See ACTIVITY_TRACKS.md's Admin section.
export const ActivityTrackList = () => {
  const { tableProps } = useTable({ resource: 'activity-tracks', syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" render={(name: string | null) => name ?? 'Untitled track'} />
        <Table.Column dataIndex="userEmail" title="Owner" />
        <Table.Column
          dataIndex="distanceMeters"
          title="Distance"
          render={(value: number) => `${(value / 1000).toFixed(1)} km`}
        />
        <Table.Column dataIndex="source" title="Source" render={(source: string) => <Tag color={SOURCE_COLOR[source]}>{source}</Tag>} />
        <Table.Column
          dataIndex="visibility"
          title="Visibility"
          render={(visibility: string) => <Tag color={VISIBILITY_COLOR[visibility]}>{visibility}</Tag>}
        />
        <Table.Column dataIndex="startedAt" title="Started" render={(value: string) => new Date(value).toLocaleDateString()} />
        <Table.Column
          title="Actions"
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
