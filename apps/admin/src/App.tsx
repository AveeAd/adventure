import { Authenticated, Refine } from '@refinedev/core';
import { ThemedLayout } from '@refinedev/antd';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { authProvider } from './auth/auth-provider';
import { dataProvider } from './data-provider';
import { AuthCallbackPage } from './pages/AuthCallback';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import {
  activityTypeConfig,
  countryConfig,
  difficultyLevelConfig,
  seasonConfig,
} from './resources/config';
import { MasterDataCreate } from './resources/MasterDataCreate';
import { MasterDataEdit } from './resources/MasterDataEdit';
import { MasterDataList } from './resources/MasterDataList';
import { DistrictCreate } from './resources/location/DistrictCreate';
import { DistrictEdit } from './resources/location/DistrictEdit';
import { DistrictList } from './resources/location/DistrictList';
import { MunicipalityCreate } from './resources/location/MunicipalityCreate';
import { MunicipalityEdit } from './resources/location/MunicipalityEdit';
import { MunicipalityList } from './resources/location/MunicipalityList';
import { ProvinceCreate } from './resources/location/ProvinceCreate';
import { ProvinceEdit } from './resources/location/ProvinceEdit';
import { ProvinceList } from './resources/location/ProvinceList';

function App() {
  return (
    <BrowserRouter>
      <Refine
        routerProvider={routerProvider}
        authProvider={authProvider}
        dataProvider={dataProvider}
        resources={[
          {
            name: 'activity-types',
            list: '/activity-types',
            create: '/activity-types/create',
            edit: '/activity-types/edit/:id',
            meta: { label: 'Activity Types' },
          },
          {
            name: 'difficulty-levels',
            list: '/difficulty-levels',
            create: '/difficulty-levels/create',
            edit: '/difficulty-levels/edit/:id',
            meta: { label: 'Difficulty Levels' },
          },
          {
            name: 'seasons',
            list: '/seasons',
            create: '/seasons/create',
            edit: '/seasons/edit/:id',
            meta: { label: 'Seasons' },
          },
          {
            name: 'countries',
            list: '/countries',
            create: '/countries/create',
            edit: '/countries/edit/:id',
            meta: { label: 'Countries' },
          },
          {
            name: 'provinces',
            list: '/provinces',
            create: '/provinces/create',
            edit: '/provinces/edit/:id',
            meta: { label: 'Provinces' },
          },
          {
            name: 'districts',
            list: '/districts',
            create: '/districts/create',
            edit: '/districts/edit/:id',
            meta: { label: 'Districts' },
          },
          {
            name: 'municipalities',
            list: '/municipalities',
            create: '/municipalities/create',
            edit: '/municipalities/edit/:id',
            meta: { label: 'Municipalities' },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            element={
              <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
                <ThemedLayout>
                  <Outlet />
                </ThemedLayout>
              </Authenticated>
            }
          >
            <Route index element={<DashboardPage />} />

            <Route path="/activity-types">
              <Route index element={<MasterDataList config={activityTypeConfig} />} />
              <Route path="create" element={<MasterDataCreate config={activityTypeConfig} />} />
              <Route path="edit/:id" element={<MasterDataEdit config={activityTypeConfig} />} />
            </Route>

            <Route path="/difficulty-levels">
              <Route index element={<MasterDataList config={difficultyLevelConfig} />} />
              <Route path="create" element={<MasterDataCreate config={difficultyLevelConfig} />} />
              <Route path="edit/:id" element={<MasterDataEdit config={difficultyLevelConfig} />} />
            </Route>

            <Route path="/seasons">
              <Route index element={<MasterDataList config={seasonConfig} />} />
              <Route path="create" element={<MasterDataCreate config={seasonConfig} />} />
              <Route path="edit/:id" element={<MasterDataEdit config={seasonConfig} />} />
            </Route>

            <Route path="/countries">
              <Route index element={<MasterDataList config={countryConfig} />} />
              <Route path="create" element={<MasterDataCreate config={countryConfig} />} />
              <Route path="edit/:id" element={<MasterDataEdit config={countryConfig} />} />
            </Route>

            <Route path="/provinces">
              <Route index element={<ProvinceList />} />
              <Route path="create" element={<ProvinceCreate />} />
              <Route path="edit/:id" element={<ProvinceEdit />} />
            </Route>

            <Route path="/districts">
              <Route index element={<DistrictList />} />
              <Route path="create" element={<DistrictCreate />} />
              <Route path="edit/:id" element={<DistrictEdit />} />
            </Route>

            <Route path="/municipalities">
              <Route index element={<MunicipalityList />} />
              <Route path="create" element={<MunicipalityCreate />} />
              <Route path="edit/:id" element={<MunicipalityEdit />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}

export default App;
