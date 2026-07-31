import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Alert, Descriptions, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface GuideProfileDetail {
  id: string;
  userId: string;
  bio: string | null;
  licenseNumber: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: string | null;
  currency: string;
  verificationStatus: string;
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string; requiresRegisteredAgency: boolean } }[];
  languages: { language: { name: string } }[];
}

const STATUS_OPTIONS = ['UNVERIFIED', 'PENDING_LICENSE_REVIEW', 'VERIFIED'];

export const GuideProfileShow = () => {
  const { query, result: record } = useShow<GuideProfileDetail>({ resource: 'guide-profiles' });
  const coversRestrictedDistrict = record?.regions.some((r) => r.district.requiresRegisteredAgency);
  const { t } = useTranslation('resources');

  return (
    <Show isLoading={query.isLoading}>
      {record && (
        <>
          {coversRestrictedDistrict && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={t('guide-profiles.restrictedAlert.message')}
              description={t('guide-profiles.restrictedAlert.description')}
            />
          )}

          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('guide-profiles.fields.userId')}>{record.userId}</Descriptions.Item>
            <Descriptions.Item label={t('guide-profiles.fields.licenseNumber')}>
              {record.licenseNumber ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('guide-profiles.fields.specialties')}>
              {record.specialties.map((s) => s.activityType.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('guide-profiles.fields.regions')}>
              {record.regions.map((r) => r.district.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('guide-profiles.fields.languages')}>
              {record.languages.map((l) => l.language.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('guide-profiles.fields.rate')}>
              {record.rateMin || record.rateMax
                ? `${record.currency} ${record.rateMin}-${record.rateMax} ${record.rateUnit ?? ''}`
                : '—'}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('guide-profiles.fields.bio')}
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.bio ?? t('guide-profiles.noBio')}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('guide-profiles.fields.verificationStatus')}
          </Typography.Title>
          <VerificationStatusControl
            resource="guide-profiles"
            id={record.id}
            status={record.verificationStatus}
            options={STATUS_OPTIONS}
          />
        </>
      )}
    </Show>
  );
};
