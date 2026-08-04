import { DeleteButton, Show } from '@refinedev/antd';
import { useCustomMutation, useInvalidate, useShow } from '@refinedev/core';
import { Button, Descriptions, Tag, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
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
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
  elevationProfile: TrailElevationProfile | null;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const TrailShow = () => {
  const { query, result: record } = useShow<TrailDetail>({ resource: 'trails' });
  const invalidate = useInvalidate();
  const { mutate: deleteProfile, mutation: deleteProfileMutation } = useCustomMutation();
  const { t } = useTranslation('resources');

  const removeProfile = () => {
    if (!record) return;
    deleteProfile(
      { url: `/trails/${record.id}/elevation-profile`, method: 'delete', values: {} },
      {
        onSuccess: () => {
          message.success(t('trails.elevationProfileDeleted'));
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
            <Descriptions.Item label={t('trails.fields.name')}>{record.name ?? t('trails.defaultName')}</Descriptions.Item>
            <Descriptions.Item label={t('trails.fields.distance')}>
              {record.distanceMeters ? `${(record.distanceMeters / 1000).toFixed(1)} km` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('trails.fields.source')}>
              <Tag>{record.source.replaceAll('_', ' ')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.currentStatus')}>
              {!record.approvedRevisionId && <Tag color="gold">{t('approval.status.PENDING')}</Tag>}
              {record.pendingRevisionCount > 0 && (
                <Tag color="gold">{t('geodataHistory.pendingCount', { count: record.pendingRevisionCount })}</Tag>
              )}
              {record.approvedRevisionId && record.pendingRevisionCount === 0 && (
                <Tag color="green">{t('approval.status.APPROVED')}</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24 }}>
            <GeometryMap geometry={record.geometry} />
          </div>

          {record.elevationProfile && (
            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>{t('trails.fields.elevationProfile')}</Typography.Title>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label={t('trails.fields.ascent')}>{record.elevationProfile.ascentMeters} m</Descriptions.Item>
                <Descriptions.Item label={t('trails.fields.descent')}>{record.elevationProfile.descentMeters} m</Descriptions.Item>
                <Descriptions.Item label={t('trails.fields.minElevation')}>{record.elevationProfile.minElevationMeters} m</Descriptions.Item>
                <Descriptions.Item label={t('trails.fields.maxElevation')}>{record.elevationProfile.maxElevationMeters} m</Descriptions.Item>
              </Descriptions>
              <Button danger style={{ marginTop: 12 }} onClick={removeProfile} loading={deleteProfileMutation.isPending}>
                {t('trails.deleteProfileButton')}
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
            <Typography.Title level={5}>{t('trails.fields.history')}</Typography.Title>
            <GeodataHistory resource="trails" id={record.id} />
          </div>
        </>
      )}
    </Show>
  );
};
