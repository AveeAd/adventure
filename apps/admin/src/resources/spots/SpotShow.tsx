import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Typography } from 'antd';
import { GeometryMap } from '../../components/GeometryMap';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface SpotDetail {
  id: string;
  adventurePageId: string;
  spotTypeName: string;
  name: string;
  description: string | null;
  geometry: GeoJSON.Point;
  elevationMeters: number | null;
  verificationStatus: string;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const SpotShow = () => {
  const { query, result: record } = useShow<SpotDetail>({ resource: 'spots' });

  return (
    <Show
      isLoading={query.isLoading}
      headerButtons={<DeleteButton resource="spots" recordItemId={record?.id} />}
    >
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">{record.name}</Descriptions.Item>
            <Descriptions.Item label="Type">{record.spotTypeName}</Descriptions.Item>
            <Descriptions.Item label="Elevation">
              {record.elevationMeters ? `${record.elevationMeters}m` : '—'}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Description
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.description ?? 'No description'}</Typography.Paragraph>

          <GeometryMap geometry={record.geometry} />

          <div style={{ marginTop: 24 }}>
            <VerificationStatusControl
              resource="spots"
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
