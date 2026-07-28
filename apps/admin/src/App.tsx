import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { authProvider } from './auth/auth-provider';
import { dataProvider } from './data-provider';
import { AuthCallbackPage } from './pages/AuthCallback';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Refine routerProvider={routerProvider} authProvider={authProvider} dataProvider={dataProvider}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            element={
              <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
                <Outlet />
              </Authenticated>
            }
          >
            <Route index element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}

export default App;
