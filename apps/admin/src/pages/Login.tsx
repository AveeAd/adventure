import { useLogin } from '@refinedev/core';
import { Button, Card, Space, Typography } from 'antd';

export const LoginPage = () => {
  const { mutate: login, isPending } = useLogin();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Card style={{ width: 360 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', margin: 0 }}>
            Adventure admin
          </Typography.Title>
          <Button type="primary" block loading={isPending} onClick={() => login({})}>
            Sign in with Google
          </Button>
        </Space>
      </Card>
    </div>
  );
};
