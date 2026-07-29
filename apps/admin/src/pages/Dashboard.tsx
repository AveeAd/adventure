import { useGetIdentity, useLogout } from '@refinedev/core';
import { Button, Card, Col, Row, Space, theme, Typography } from 'antd';
import { Building2, CalendarDays, Compass, Flag, Gauge, MapPin, MapPinned } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';

interface Identity {
  email: string;
  role: string;
}

const resourceLinks: {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; color?: string }>;
}[] = [
  { to: '/activity-types', label: 'Activity Types', description: 'Trekking, biking, paragliding...', icon: Compass },
  { to: '/difficulty-levels', label: 'Difficulty Levels', description: 'Easy through expert', icon: Gauge },
  { to: '/seasons', label: 'Seasons', description: 'Best-time-to-visit tags', icon: CalendarDays },
  { to: '/countries', label: 'Countries', description: 'Root of the location hierarchy', icon: Flag },
  { to: '/provinces', label: 'Provinces', description: "Nepal's 7 provinces", icon: MapPin },
  { to: '/districts', label: 'Districts', description: 'Includes restricted-agency flag', icon: MapPinned },
  { to: '/municipalities', label: 'Municipalities', description: 'Finest location tier', icon: Building2 },
];

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

      <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
        {resourceLinks.map(({ to, label, description, icon: Icon }) => (
          <Col key={to} xs={24} sm={12} lg={8} xl={6}>
            <Link to={to}>
              <Card hoverable styles={{ body: { padding: 20 } }}>
                <Icon size={22} color={token.colorPrimary} />
                <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 2 }}>
                  {label}
                </Typography.Title>
                <Typography.Text type="secondary">{description}</Typography.Text>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
};
