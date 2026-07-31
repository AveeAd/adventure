import { useLogin } from '@refinedev/core';
import { Card, Typography } from 'antd';
import { Mountain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePrefersDark } from '../hooks/usePrefersDark';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width={20} height={20}>
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z" />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.9l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export const LoginPage = () => {
  const { mutate: login, isPending } = useLogin();
  const prefersDark = usePrefersDark();
  const { t } = useTranslation('common');

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: prefersDark
          ? 'linear-gradient(135deg, #163024 0%, #0c0a09 50%, #2c1509 100%)'
          : 'linear-gradient(135deg, #f1f7f3 0%, #fafaf9 50%, #fdf4f0 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: 360, textAlign: 'center' }} styles={{ body: { padding: 32 } }}>
        <Mountain size={40} strokeWidth={2.5} color="#2f6b4f" style={{ margin: '0 auto' }} />
        <Typography.Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
          {t('login.signInTo', { appName: t('appName') })}
        </Typography.Title>
        <Typography.Text type="secondary">{t('login.subtitle')}</Typography.Text>

        <button
          type="button"
          onClick={() => login({})}
          disabled={isPending}
          style={{
            marginTop: 24,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 8,
            border: prefersDark ? '1px solid #44403c' : '1px solid #d6d3d1',
            background: prefersDark ? '#292524' : '#fff',
            fontSize: 14,
            fontWeight: 500,
            color: prefersDark ? '#f5f5f4' : '#44403c',
            cursor: isPending ? 'default' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <GoogleIcon />
          {t('login.signInWithGoogle')}
        </button>
      </Card>
    </div>
  );
};
