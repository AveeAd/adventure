import { DeleteButton, Show } from '@refinedev/antd';
import { useCustomMutation, useInvalidate, useShow } from '@refinedev/core';
import { Button, Descriptions, Tag, Typography, message } from 'antd';
import { GeometryMap } from '../../components/GeometryMap';
import { GeodataHistory } from '../common/GeodataHistory';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface TrailElevationProfile {
  sampleCount: number;
  ascentMeters: number;
  descentMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
}

interface TrailDetail {
  id: string;
  adventurePageId: string;
  name: string | null;
  geometry: GeoJSON.LineString;
  distanceMeters: number | null;
  source: string;
  verificationStatus: string;
  elevationProfile: TrailElevationProfile | null;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const TrailShow = () => {
  const { query, result: record } = useShow<TrailDetail>({ resource: 'trails' });
  const invalidate = useInvalidate();
  const { mutate: deleteProfile, mutation: deleteProfileMutation } = useCustomMutation();

  const removeProfile = () => {
    if (!record) return;
    deleteProfile(
      { url: `/trails/${record.id}/elevation-profile`, method: 'delete', values: {} },
      {
        onSuccess: () => {
          message.success('Elevation profile deleted');
          invalidate({ resource: 'trails', invalidates: ['detail'], id: record.id });
        },
      },
    );
  };

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
            <Descriptions.Item label="Source">
              <Tag>{record.source.replaceAll('_', ' ')}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24 }}>
            <GeometryMap geometry={record.geometry} />
          </div>

          {record.elevationProfile && (
            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Elevation profile</Typography.Title>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Ascent">{record.elevationProfile.ascentMeters} m</Descriptions.Item>
                <Descriptions.Item label="Descent">{record.elevationProfile.descentMeters} m</Descriptions.Item>
                <Descriptions.Item label="Min elevation">{record.elevationProfile.minElevationMeters} m</Descriptions.Item>
                <Descriptions.Item label="Max elevation">{record.elevationProfile.maxElevationMeters} m</Descriptions.Item>
              </Descriptions>
              <Button danger style={{ marginTop: 12 }} onClick={removeProfile} loading={deleteProfileMutation.isPending}>
                Delete profile (bad import escape hatch)
              </Button>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <VerificationStatusControl
              resource="trails"
              id={record.id}
              status={record.verificationStatus}
              options={STATUS_OPTIONS}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <Typography.Title level={5}>History</Typography.Title>
            <GeodataHistory resource="trails" id={record.id} />
          </div>
        </>
      )}
    </Show>
  );
};
