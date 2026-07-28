import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { tokenStore } from '../auth/token-store';

export const AuthCallbackPage = () => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    if (accessToken) {
      tokenStore.set(accessToken);
    }
    // strip the token out of the URL/history - it must never linger there
    window.history.replaceState(null, '', window.location.pathname);
    setDone(true);
  }, []);

  if (!done) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <Navigate to={tokenStore.get() ? '/' : '/login'} replace />;
};
