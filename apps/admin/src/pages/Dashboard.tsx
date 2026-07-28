import { useGetIdentity, useLogout } from '@refinedev/core';
import { Button, Space, Typography } from 'antd';

interface Identity {
  email: string;
  role: string;
}

export const DashboardPage = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const { mutate: logout } = useLogout();

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="middle">
        <Typography.Title level={3}>Adventure admin</Typography.Title>
        <Typography.Text>Logged in as {identity?.email ?? '...'}</Typography.Text>
        <Button onClick={() => logout()}>Log out</Button>
      </Space>
    </div>
  );
};
