import { DeleteButton, Show } from '@refinedev/antd';
import { useCustomMutation, useInvalidate, useShow } from '@refinedev/core';
import { Button, Descriptions, Image, Space, Tag, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PageHistory } from '../common/PageHistory';
import { VerificationStatusControl } from '../common/VerificationStatusControl';

interface MediaItem {
  id: string;
  url: string;
  // Nullable - only present on images uploaded through the image-processing
  // pipeline (apps/api/src/uploads/image-processor.service.ts); older
  // uploads only have `url`.
  mediumUrl?: string | null;
  caption: string | null;
  altText: string | null;
}

interface AdventurePageDetail {
  id: string;
  title: string;
  summary: string | null;
  verificationStatus: string;
  approvedRevisionId: string | null;
  pendingRevisionCount: number;
  activityType: { name: string } | null;
  difficultyLevel: { name: string } | null;
  districts: { district: { name: string } }[];
  seasons: { season: { name: string } }[];
  currentRevision: { content: string } | null;
  approvedRevision: { content: string } | null;
  contributorIds: string[];
  likeCount: number;
  media: MediaItem[];
}

const STATUS_OPTIONS = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];

export const AdventurePageShow = () => {
  const { query, result: record } = useShow<AdventurePageDetail>({ resource: 'adventure-pages' });
  const { t } = useTranslation(['resources', 'common']);

  return (
    <Show isLoading={query.isLoading} headerButtons={<DeleteButton resource="adventure-pages" recordItemId={record?.id} />}>
      {record && (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={t('adventure-pages.fields.title')}>{record.title}</Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.activity')}>
              {record.activityType?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.difficulty')}>
              {record.difficultyLevel?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.districts')}>
              {record.districts.map((d) => d.district.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.seasons')}>
              {record.seasons.map((s) => s.season.name).join(', ') || '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.contributors')}>
              {record.contributorIds.length}
            </Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.likes')}>{record.likeCount}</Descriptions.Item>
            <Descriptions.Item label={t('adventure-pages.fields.currentStatus')}>
              <Tag>{record.verificationStatus}</Tag>
              {!record.approvedRevisionId && <Tag color="gold">{t('approval.status.PENDING')}</Tag>}
              {record.pendingRevisionCount > 0 && (
                <Tag color="gold">{t('geodataHistory.pendingCount', { count: record.pendingRevisionCount })}</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('adventure-pages.fields.verificationStatus')}
          </Typography.Title>
          <VerificationStatusControl
            resource="adventure-pages"
            id={record.id}
            status={record.verificationStatus}
            options={STATUS_OPTIONS}
          />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('adventure-pages.fields.currentRevisionContent')}
          </Typography.Title>
          <Typography.Paragraph
            style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}
            type="secondary"
          >
            {(record.approvedRevision ?? record.currentRevision)?.content ?? t('adventure-pages.noContent')}
          </Typography.Paragraph>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('adventure-pages.fields.photos')}
          </Typography.Title>
          <MediaGallery pageId={record.id} media={record.media} />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            {t('adventure-pages.fields.history')}
          </Typography.Title>
          <PageHistory pageId={record.id} />
        </>
      )}
    </Show>
  );
};

function MediaGallery({ pageId, media }: { pageId: string; media: MediaItem[] }) {
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();
  const { t } = useTranslation(['resources', 'common']);

  if (media.length === 0) {
    return <Typography.Text type="secondary">{t('adventure-pages.noPhotos')}</Typography.Text>;
  }

  const remove = (mediaId: string) => {
    mutate(
      { url: `/adventure-pages/${pageId}/media/${mediaId}`, method: 'delete', values: {} },
      {
        onSuccess: () => {
          message.success(t('adventure-pages.photoDeleted'));
          invalidate({ resource: 'adventure-pages', invalidates: ['detail'], id: pageId });
        },
      },
    );
  };

  return (
    <Space wrap>
      {media.map((item) => (
        <Space key={item.id} direction="vertical" align="center" size="small">
          <Image
            src={item.mediumUrl ?? item.url}
            alt={item.altText ?? ''}
            width={120}
            height={90}
            style={{ objectFit: 'cover' }}
            preview={{ src: item.url }}
            loading="lazy"
          />
          <Button danger size="small" loading={mutation.isPending} onClick={() => remove(item.id)}>
            {t('common:actions.delete')}
          </Button>
        </Space>
      ))}
    </Space>
  );
}
