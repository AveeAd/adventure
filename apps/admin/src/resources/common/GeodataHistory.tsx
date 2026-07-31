import { useCustom, useCustomMutation, useInvalidate } from '@refinedev/core';
import { Button, Collapse, Descriptions, Space, Tag, message } from 'antd';
import { GeometryMap } from '../../components/GeometryMap';

interface RevisionSummary {
  id: string;
  version: number;
  editorId: string;
  editSummary: string | null;
  isSafetyCriticalEdit: boolean;
  createdAt: string;
}

interface DiffResult {
  from: number;
  to: number;
  changes: { field: string; from: unknown; to: unknown }[];
  geometry: {
    from: GeoJSON.Geometry;
    to: GeoJSON.Geometry;
    maxDeviationMeters: number;
    geometryChanged: boolean;
    vertexDelta?: number;
    lengthDeltaMeters?: number;
  };
}

// Read-only revision timeline for TrailShow/SpotShow - expand a row to see
// its diff against the prior version (geometry overlay + scalar stats), plus
// a revert action reusing the same public endpoint the contribute UI uses.
// No new Refine resource: revisions aren't independently CRUDable, staying
// inside admin's "read + moderate, not full authoring" boundary. See
// GEODATA_HISTORY.md's Admin section.
export function GeodataHistory({ resource, id }: { resource: 'trails' | 'spots'; id: string }) {
  const { result, query } = useCustom<RevisionSummary[]>({
    url: `/${resource}/${id}/revisions`,
    method: 'get',
  });
  const invalidate = useInvalidate();
  const { mutate: revertMutate, mutation: revertMutation } = useCustomMutation();

  const revisions = [...(result?.data ?? [])].sort((a, b) => b.version - a.version);

  const revert = (version: number) => {
    revertMutate(
      { url: `/${resource}/${id}/revisions/${version}/revert`, method: 'post', values: {} },
      {
        onSuccess: () => {
          message.success(`Reverted to version ${version}`);
          invalidate({ resource, invalidates: ['detail', 'list'], id });
          query.refetch();
        },
      },
    );
  };

  return (
    <Collapse
      items={revisions.map((revision) => ({
        key: revision.version,
        label: (
          <Space>
            <strong>v{revision.version}</strong>
            <span>{new Date(revision.createdAt).toLocaleString()}</span>
            {revision.isSafetyCriticalEdit && <Tag color="orange">safety-critical</Tag>}
            {revision.editSummary && <span style={{ color: '#888' }}>{revision.editSummary}</span>}
          </Space>
        ),
        children: (
          <RevisionDiffPanel
            resource={resource}
            id={id}
            version={revision.version}
            canRevert={revision.version !== revisions[0]?.version}
            onRevert={() => revert(revision.version)}
            reverting={revertMutation.isPending}
          />
        ),
      }))}
    />
  );
}

function RevisionDiffPanel({
  resource,
  id,
  version,
  canRevert,
  onRevert,
  reverting,
}: {
  resource: 'trails' | 'spots';
  id: string;
  version: number;
  canRevert: boolean;
  onRevert: () => void;
  reverting: boolean;
}) {
  const { result, query } = useCustom<DiffResult>({
    url: `/${resource}/${id}/diff`,
    method: 'get',
    config: { query: { from: Math.max(1, version - 1), to: version } },
    queryOptions: { enabled: version > 1 },
  });

  if (version === 1) {
    return (
      <p style={{ color: '#888' }}>
        First recorded revision - nothing to diff against.
      </p>
    );
  }

  if (query.isLoading || !result?.data) {
    return <p>Loading diff...</p>;
  }

  const diff = result.data;

  return (
    <>
      {diff.changes.length > 0 && (
        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
          {diff.changes.map((change) => (
            <Descriptions.Item key={change.field} label={change.field}>
              {String(change.from ?? '—')} → {String(change.to ?? '—')}
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}

      <Space style={{ marginBottom: 12 }}>
        <Tag color={diff.geometry.geometryChanged ? 'blue' : 'default'}>
          {diff.geometry.geometryChanged ? 'Geometry changed' : 'Geometry unchanged'}
        </Tag>
        {diff.geometry.geometryChanged && (
          <span style={{ color: '#888' }}>
            max deviation ≈ {Math.round(diff.geometry.maxDeviationMeters)} m
            {diff.geometry.lengthDeltaMeters !== undefined && `, length Δ ${diff.geometry.lengthDeltaMeters} m`}
            {diff.geometry.vertexDelta !== undefined && `, vertices Δ ${diff.geometry.vertexDelta}`}
          </span>
        )}
      </Space>

      <GeometryMap geometry={diff.geometry.to} compareGeometry={diff.geometry.from} />

      {canRevert && (
        <Button style={{ marginTop: 12 }} danger onClick={onRevert} loading={reverting}>
          Revert to v{version}
        </Button>
      )}
    </>
  );
}
