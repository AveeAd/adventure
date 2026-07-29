import { Authenticated, Refine } from '@refinedev/core';
import { ThemedLayout } from '@refinedev/antd';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { authProvider } from './auth/auth-provider';
import { dataProvider } from './data-provider';
import { usePrefersDark } from './hooks/usePrefersDark';
import { AuthCallbackPage } from './pages/AuthCallback';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import {
  activityTypeConfig,
  countryConfig,
  difficultyLevelConfig,
  languageConfig,
  seasonConfig,
  spotTypeConfig,
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
import { AdventurePageList } from './resources/adventure-pages/AdventurePageList';
import { AdventurePageShow } from './resources/adventure-pages/AdventurePageShow';
import { TripReportList } from './resources/trip-reports/TripReportList';
import { TripReportShow } from './resources/trip-reports/TripReportShow';
import { TripGroupList } from './resources/trip-groups/TripGroupList';
import { TripGroupShow } from './resources/trip-groups/TripGroupShow';
import { GuideProfileList } from './resources/guide-profiles/GuideProfileList';
import { GuideProfileShow } from './resources/guide-profiles/GuideProfileShow';
import { TrailList } from './resources/trails/TrailList';
import { TrailShow } from './resources/trails/TrailShow';
import { SpotList } from './resources/spots/SpotList';
import { SpotShow } from './resources/spots/SpotShow';
import { UserList } from './resources/users/UserList';
import { UserEdit } from './resources/users/UserEdit';
import { AppTitle } from './components/AppTitle';
import { darkTheme, lightTheme } from './theme';

const masterDataResourceConfigs = [
  activityTypeConfig,
  difficultyLevelConfig,
  seasonConfig,
  languageConfig,
  spotTypeConfig,
];

function App() {
  const prefersDark = usePrefersDark();

  return (
    <ConfigProvider theme={prefersDark ? darkTheme : lightTheme}>
      <BrowserRouter>
        <Refine
          routerProvider={routerProvider}
          authProvider={authProvider}
          dataProvider={dataProvider}
          resources={[
            { name: 'master-data', meta: { label: 'Master Data' } },
            ...masterDataResourceConfigs.map((config) => ({
              name: config.resource,
              list: `/${config.resource}`,
              create: `/${config.resource}/create`,
              edit: `/${config.resource}/edit/:id`,
              meta: { label: config.label, parent: 'master-data' },
            })),

            { name: 'locations', meta: { label: 'Locations' } },
            {
              name: 'countries',
              list: '/countries',
              create: '/countries/create',
              edit: '/countries/edit/:id',
              meta: { label: 'Countries', parent: 'locations' },
            },
            {
              name: 'provinces',
              list: '/provinces',
              create: '/provinces/create',
              edit: '/provinces/edit/:id',
              meta: { label: 'Provinces', parent: 'locations' },
            },
            {
              name: 'districts',
              list: '/districts',
              create: '/districts/create',
              edit: '/districts/edit/:id',
              meta: { label: 'Districts', parent: 'locations' },
            },
            {
              name: 'municipalities',
              list: '/municipalities',
              create: '/municipalities/create',
              edit: '/municipalities/edit/:id',
              meta: { label: 'Municipalities', parent: 'locations' },
            },

            { name: 'content', meta: { label: 'Content' } },
            {
              name: 'adventure-pages',
              list: '/adventure-pages',
              show: '/adventure-pages/show/:id',
              meta: { label: 'Adventure Pages', parent: 'content' },
            },
            {
              name: 'trip-reports',
              list: '/trip-reports',
              show: '/trip-reports/show/:id',
              meta: { label: 'Trip Reports', parent: 'content' },
            },
            {
              name: 'trip-groups',
              list: '/trip-groups',
              show: '/trip-groups/show/:id',
              meta: { label: 'Trip Groups', parent: 'content' },
            },

            { name: 'geodata', meta: { label: 'Trails & Spots' } },
            {
              name: 'trails',
              list: '/trails',
              show: '/trails/show/:id',
              meta: { label: 'Trails', parent: 'geodata' },
            },
            {
              name: 'spots',
              list: '/spots',
              show: '/spots/show/:id',
              meta: { label: 'Spots', parent: 'geodata' },
            },

            {
              name: 'guide-profiles',
              list: '/guide-profiles',
              show: '/guide-profiles/show/:id',
              meta: { label: 'Guide Profiles' },
            },
            {
              name: 'users',
              list: '/users',
              edit: '/users/edit/:id',
              meta: { label: 'Users' },
            },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              element={
                <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
                  <ThemedLayout Title={AppTitle}>
                    <Outlet />
                  </ThemedLayout>
                </Authenticated>
              }
            >
              <Route index element={<DashboardPage />} />

              {masterDataResourceConfigs.map((config) => (
                <Route key={config.resource} path={`/${config.resource}`}>
                  <Route index element={<MasterDataList config={config} />} />
                  <Route path="create" element={<MasterDataCreate config={config} />} />
                  <Route path="edit/:id" element={<MasterDataEdit config={config} />} />
                </Route>
              ))}

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

              <Route path="/adventure-pages">
                <Route index element={<AdventurePageList />} />
                <Route path="show/:id" element={<AdventurePageShow />} />
              </Route>

              <Route path="/trip-reports">
                <Route index element={<TripReportList />} />
                <Route path="show/:id" element={<TripReportShow />} />
              </Route>

              <Route path="/trip-groups">
                <Route index element={<TripGroupList />} />
                <Route path="show/:id" element={<TripGroupShow />} />
              </Route>

              <Route path="/trails">
                <Route index element={<TrailList />} />
                <Route path="show/:id" element={<TrailShow />} />
              </Route>

              <Route path="/spots">
                <Route index element={<SpotList />} />
                <Route path="show/:id" element={<SpotShow />} />
              </Route>

              <Route path="/guide-profiles">
                <Route index element={<GuideProfileList />} />
                <Route path="show/:id" element={<GuideProfileShow />} />
              </Route>

              <Route path="/users">
                <Route index element={<UserList />} />
                <Route path="edit/:id" element={<UserEdit />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Refine>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
