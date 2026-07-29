import { useGetIdentity, useLogout } from '@refinedev/core';
import { Button, Card, Col, Row, Space, theme, Typography } from 'antd';
import {
  BookOpen,
  Building2,
  CalendarDays,
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
  Users as UsersIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';

interface Identity {
  email: string;
  role: string;
}

interface ResourceLink {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}

const contentLinks: ResourceLink[] = [
  { to: '/adventure-pages', label: 'Adventure Pages', description: 'Moderate content & verification status', icon: BookOpen },
  { to: '/trip-reports', label: 'Trip Reports', description: 'View and remove trip logs', icon: Tent },
  { to: '/trails', label: 'Trails', description: 'Moderate trail geometry & verification', icon: RouteIcon },
  { to: '/spots', label: 'Spots', description: 'Moderate points of interest', icon: LandPlot },
  { to: '/guide-profiles', label: 'Guide Profiles', description: 'License verification review queue', icon: ShieldCheck },
  { to: '/users', label: 'Users', description: 'Manage roles and access', icon: UsersIcon },
];

const masterDataLinks: ResourceLink[] = [
  { to: '/activity-types', label: 'Activity Types', description: 'Trekking, biking, paragliding...', icon: Compass },
  { to: '/difficulty-levels', label: 'Difficulty Levels', description: 'Easy through expert', icon: Gauge },
  { to: '/seasons', label: 'Seasons', description: 'Best-time-to-visit tags', icon: CalendarDays },
  { to: '/languages', label: 'Languages', description: "Guides' spoken languages", icon: Languages },
  { to: '/spot-types', label: 'Spot Types', description: 'Point-of-interest categories', icon: SpotIcon },
];

const locationLinks: ResourceLink[] = [
  { to: '/countries', label: 'Countries', description: 'Root of the location hierarchy', icon: Flag },
  { to: '/provinces', label: 'Provinces', description: "Nepal's 7 provinces", icon: MapPin },
  { to: '/districts', label: 'Districts', description: 'Includes restricted-agency flag', icon: MapPinned },
  { to: '/municipalities', label: 'Municipalities', description: 'Finest location tier', icon: Building2 },
];

const ResourceLinkGrid = ({ links, primaryColor }: { links: ResourceLink[]; primaryColor: string }) => (
  <Row gutter={[16, 16]}>
    {links.map(({ to, label, description, icon: Icon }) => (
      <Col key={to} xs={24} sm={12} lg={8} xl={6}>
        <Link to={to}>
          <Card hoverable styles={{ body: { padding: 20 } }}>
            <Icon size={22} color={primaryColor} />
            <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 2 }}>
              {label}
            </Typography.Title>
            <Typography.Text type="secondary">{description}</Typography.Text>
          </Card>
        </Link>
      </Col>
    ))}
  </Row>
);

export const DashboardPage = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();
  const { token } = theme.useToken();

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }} align="start">
        <div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Welcome back
          </Typography.Title>
          <Typography.Text type="secondary">Signed in as {identity?.email ?? '...'}</Typography.Text>
        </div>
        <Button onClick={() => logout()}>Log out</Button>
      </Space>

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        Content & Users
      </Typography.Title>
      <ResourceLinkGrid links={contentLinks} primaryColor={token.colorPrimary} />

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        Master Data
      </Typography.Title>
      <ResourceLinkGrid links={masterDataLinks} primaryColor={token.colorPrimary} />

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        Locations
      </Typography.Title>
      <ResourceLinkGrid links={locationLinks} primaryColor={token.colorPrimary} />
    </div>
  );
};
