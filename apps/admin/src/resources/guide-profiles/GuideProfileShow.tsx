import { Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Alert, Descriptions, Typography } from 'antd';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface GuideProfileDetail {
  id: string;
  userId: string;
  bio: string | null;
  licenseNumber: string | null;
  rateMin: number | null;
  rateMax: number | null;
  rateUnit: string | null;
  verificationStatus: string;
  specialties: { activityType: { name: string } }[];
  regions: { district: { name: string; requiresRegisteredAgency: boolean } }[];
  languages: { language: { name: string } }[];
}

const STATUS_OPTIONS = ['UNVERIFIED', 'PENDING_LICENSE_REVIEW', 'VERIFIED'];

export const GuideProfileShow = () => {
  const { query, result: record } = useShow<GuideProfileDetail>({ resource: 'guide-profiles' });
  const coversRestrictedDistrict = record?.regions.some((r) => r.district.requiresRegisteredAgency);

  return (
    <Show isLoading={query.isLoading}>
      {record && (
        <>
          {coversRestrictedDistrict && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Covers a restricted-agency district"
              description="Per GUIDES.md, this profile can only reach VERIFIED after passing through PENDING_LICENSE_REVIEW."
            />
          )}

          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="User ID">{record.userId}</Descriptions.Item>
            <Descriptions.Item label="License number">{record.licenseNumber ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Specialties">
              {record.specialties.map((s) => s.activityType.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Regions">
              {record.regions.map((r) => r.district.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Languages">
              {record.languages.map((l) => l.language.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Rate">
              {record.rateMin || record.rateMax ? `NPR ${record.rateMin}-${record.rateMax} ${record.rateUnit ?? ''}` : '—'}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Bio
          </Typography.Title>
          <Typography.Paragraph type="secondary">{record.bio ?? 'No bio'}</Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Verification status
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
