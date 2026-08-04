import { useGetIdentity, useLogout } from '@refinedev/core';
import { Button, Card, Col, Row, Space, theme, Typography } from 'antd';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Compass,
  Flag,
  Gauge,
  LandPlot,
  Languages,
  MapPin,
  MapPinned,
  MapPinned as SpotIcon,
  Route as RouteIcon,
  ShieldCheck,
  Tent,
  UsersRound,
  Users as UsersIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface Identity {
  email: string;
  role: string;
}

// key doubles as both the resources.json label key and the
// dashboard.json descriptions key - one resource slug, two catalogues.
interface ResourceLink {
  to: string;
  key: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}

const contentLinks: ResourceLink[] = [
  { to: '/review-queue', key: 'review-queue', icon: ClipboardCheck },
  { to: '/adventure-pages', key: 'adventure-pages', icon: BookOpen },
  { to: '/trip-reports', key: 'trip-reports', icon: Tent },
  { to: '/trip-groups', key: 'trip-groups', icon: UsersRound },
  { to: '/trails', key: 'trails', icon: RouteIcon },
  { to: '/spots', key: 'spots', icon: LandPlot },
  { to: '/guide-profiles', key: 'guide-profiles', icon: ShieldCheck },
  { to: '/users', key: 'users', icon: UsersIcon },
];

const masterDataLinks: ResourceLink[] = [
  { to: '/activity-types', key: 'activity-types', icon: Compass },
  { to: '/difficulty-levels', key: 'difficulty-levels', icon: Gauge },
  { to: '/seasons', key: 'seasons', icon: CalendarDays },
  { to: '/languages', key: 'languages', icon: Languages },
  { to: '/spot-types', key: 'spot-types', icon: SpotIcon },
];

const locationLinks: ResourceLink[] = [
  { to: '/countries', key: 'countries', icon: Flag },
  { to: '/provinces', key: 'provinces', icon: MapPin },
  { to: '/districts', key: 'districts', icon: MapPinned },
  { to: '/municipalities', key: 'municipalities', icon: Building2 },
];

const ResourceLinkGrid = ({ links, primaryColor }: { links: ResourceLink[]; primaryColor: string }) => {
  const { t } = useTranslation(['resources', 'dashboard']);

  return (
    <Row gutter={[16, 16]}>
      {links.map(({ to, key, icon: Icon }) => (
        <Col key={to} xs={24} sm={12} lg={8} xl={6}>
          <Link to={to}>
            <Card hoverable styles={{ body: { padding: 20 } }}>
              <Icon size={22} color={primaryColor} />
              <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 2 }}>
                {t(`resources:${key}.label`)}
              </Typography.Title>
              <Typography.Text type="secondary">{t(`dashboard:descriptions.${key}`)}</Typography.Text>
            </Card>
          </Link>
        </Col>
      ))}
    </Row>
  );
};

export const DashboardPage = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const { token } = theme.useToken();
  const { t } = useTranslation(['dashboard', 'resources']);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }} align="start">
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t('welcomeBack')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('signedInAs', { email: identity?.email ?? '...' })}</Typography.Text>
        </div>
        <Button onClick={() => logout()}>{t('logOut')}</Button>
      </Space>

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        {t('sections.contentAndUsers')}
      </Typography.Title>
      <ResourceLinkGrid links={contentLinks} primaryColor={token.colorPrimary} />

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        {t('sections.masterData')}
      </Typography.Title>
      <ResourceLinkGrid links={masterDataLinks} primaryColor={token.colorPrimary} />

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        {t('sections.locations')}
      </Typography.Title>
      <ResourceLinkGrid links={locationLinks} primaryColor={token.colorPrimary} />
    </div>
  );
};
