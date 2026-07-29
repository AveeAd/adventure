import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions } from 'antd';
import { GeometryMap } from '../../components/GeometryMap';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface TrailDetail {
  id: string;
  adventurePageId: string;
  name: string | null;
  geometry: GeoJSON.LineString;
  distanceMeters: number | null;
  verificationStatus: string;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const TrailShow = () => {
  const { query, result: record } = useShow<TrailDetail>({ resource: 'trails' });

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="trails" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">{record.name ?? 'Trail'}</Descriptions.Item>
            <Descriptions.Item label="Distance">
              {record.distanceMeters ? `${(record.distanceMeters / 1000).toFixed(1)} km` : '—'}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24 }}>
            <GeometryMap geometry={record.geometry} />
          </div>

          <div style={{ marginTop: 24 }}>
            <VerificationStatusControl
              resource="trails"
              id={record.id}
              status={record.verificationStatus}
              options={STATUS_OPTIONS}
            />
          </div>
        </>
      )}
    </Show>
  );
};
