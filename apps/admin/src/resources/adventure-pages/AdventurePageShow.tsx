import { DeleteButton, Show } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Descriptions, Tag, Typography } from 'antd';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface AdventurePageDetail {
  id: string;
  title: string;
  summary: string | null;
  verificationStatus: string;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  currentRevision: { content: string } | null;
  contributorIds: string[];
  likeCount: number;
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const AdventurePageShow = () => {
  const { query, result: record } = useShow<AdventurePageDetail>({ resource: 'adventure-pages' });

  return (
    <Show isLoading={query.isLoading} headerButtons={<DeleteButton resource="adventure-pages" recordItemId={record?.id} />}>
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Title">{record.title}</Descriptions.Item>
            <Descriptions.Item label="Activity">{record.activityType?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Difficulty">{record.difficultyLevel?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Districts">
              {record.districts.map((d) => d.district.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Seasons">
              {record.seasons.map((s) => s.season.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Contributors">{record.contributorIds.length}</Descriptions.Item>
            <Descriptions.Item label="Likes">{record.likeCount}</Descriptions.Item>
            <Descriptions.Item label="Current status">
              <Tag>{record.verificationStatus}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Verification status
          </Typography.Title>
          <VerificationStatusControl
            resource="adventure-pages"
            id={record.id}
            status={record.verificationStatus}
            options={STATUS_OPTIONS}
          />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Current revision content
          </Typography.Title>
          <Typography.Paragraph
            style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}
            type="secondary"
          >
            {record.currentRevision?.content ?? 'No content'}
          </Typography.Paragraph>
        </>
      )}
    </Show>
  );
};
