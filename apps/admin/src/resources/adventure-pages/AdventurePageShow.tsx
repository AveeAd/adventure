import { DeleteButton, Show } from '@refinedev/antd';
import { useCustomMutation, useInvalidate, useShow } from '@refinedev/core';
import { Button, Descriptions, Image, Space, Tag, Typography, message } from 'antd';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface MediaItem {
  id: string;
  url: string;
  caption: string | null;
  altText: string | null;
}

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
  media: MediaItem[];
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

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Photos
          </Typography.Title>
          <MediaGallery pageId={record.id} media={record.media} />
        </>
      )}
    </Show>
  );
};

function MediaGallery({ pageId, media }: { pageId: string; media: MediaItem[] }) {
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();

  if (media.length === 0) {
    return <Typography.Text type="secondary">No photos.</Typography.Text>;
  }

  const remove = (mediaId: string) => {
    mutate(
      { url: `/adventure-pages/${pageId}/media/${mediaId}`, method: 'delete', values: {} },
      {
        onSuccess: () => {
          message.success('Photo deleted');
          invalidate({ resource: 'adventure-pages', invalidates: ['detail'], id: pageId });
        },
      },
    );
  };

  return (
    <Space wrap>
      {media.map((item) => (
        <Space key={item.id} direction="vertical" align="center" size="small">
          <Image src={item.url} alt={item.altText ?? ''} width={120} height={90} style={{ objectFit: 'cover' }} />
          <Button danger size="small" loading={mutation.isPending} onClick={() => remove(item.id)}>
            Delete
          </Button>
        </Space>
      ))}
    </Space>
  );
}
