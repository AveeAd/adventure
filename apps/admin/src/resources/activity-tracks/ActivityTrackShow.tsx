import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag } from 'antd';
import { formatDateTime } from '../../lib/format';
import { GeometryMap } from '../../components/GeometryMap';

interface ActivityTrackDetail {
  id: string;
  userId: string;
  name: string | null;
  notes: string | null;
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  ascentMeters: number | null;
  descentMeters: number | null;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
  source: string;
  visibility: string;
}

export const ActivityTrackShow = () => {
  const { query, result: record } = useShow<ActivityTrackDetail>({ resource: 'activity-tracks' });

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="activity-tracks" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">{record.name ?? 'Untitled track'}</Descriptions.Item>
            <Descriptions.Item label="Owner (user id)">{record.userId}</Descriptions.Item>
            <Descriptions.Item label="Distance">{(record.distanceMeters / 1000).toFixed(1)} km</Descriptions.Item>
            <Descriptions.Item label="Elapsed">{Math.round(record.elapsedSeconds / 60)} min</Descriptions.Item>
            <Descriptions.Item label="Ascent">{record.ascentMeters ?? '—'} m</Descriptions.Item>
            <Descriptions.Item label="Descent">{record.descentMeters ?? '—'} m</Descriptions.Item>
            <Descriptions.Item label="Started">{formatDateTime(record.startedAt)}</Descriptions.Item>
            <Descriptions.Item label="Source">
              <Tag>{record.source}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Visibility">
              <Tag color={record.visibility === 'PUBLIC' ? 'green' : 'default'}>{record.visibility}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {record.notes && (
            <Descriptions bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Notes">{record.notes}</Descriptions.Item>
            </Descriptions>
          )}

          <div style={{ marginTop: 24 }}>
            <GeometryMap geometry={record.geometry} />
          </div>
        </>
      )}
    </Show>
  );
};
