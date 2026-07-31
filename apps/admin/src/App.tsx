import { Authenticated, Refine } from '@refinedev/core';
import { ThemedLayout } from '@refinedev/antd';
import routerProvider, { CatchAllNavigate } from '@refinedev/react-router';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { authProvider } from './auth/auth-provider';
import { dataProvider } from './data-provider';
import { usePrefersDark } from './hooks/usePrefersDark';
import i18n from './lib/i18n';
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
  tagConfig,
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
import { ActivityTrackList } from './resources/activity-tracks/ActivityTrackList';
import { ActivityTrackShow } from './resources/activity-tracks/ActivityTrackShow';
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
  tagConfig,
];

function App() {
  const prefersDark = usePrefersDark();
  const { t } = useTranslation('resources');

  return (
    <ConfigProvider theme={prefersDark ? darkTheme : lightTheme} locale={enUS}>
      <BrowserRouter>
        <Refine
          routerProvider={routerProvider}
          authProvider={authProvider}
          dataProvider={dataProvider}
          i18nProvider={{
            translate: (key, options) => i18n.t(key, options),
            changeLocale: (lang) => i18n.changeLanguage(lang),
            getLocale: () => i18n.language,
          }}
          resources={[
            { name: 'master-data', meta: { label: t('master-data.label') } },
            ...masterDataResourceConfigs.map((config) => ({
              name: config.resource,
              list: `/${config.resource}`,
              create: `/${config.resource}/create`,
              edit: `/${config.resource}/edit/:id`,
              meta: { label: t(`${config.resource}.label`, { defaultValue: config.label }), parent: 'master-data' },
            })),

            { name: 'locations', meta: { label: t('locations.label') } },
            {
              name: 'countries',
              list: '/countries',
              create: '/countries/create',
              edit: '/countries/edit/:id',
              meta: { label: t('countries.label'), parent: 'locations' },
            },
            {
              name: 'provinces',
              list: '/provinces',
              create: '/provinces/create',
              edit: '/provinces/edit/:id',
              meta: { label: t('provinces.label'), parent: 'locations' },
            },
            {
              name: 'districts',
              list: '/districts',
              create: '/districts/create',
              edit: '/districts/edit/:id',
              meta: { label: t('districts.label'), parent: 'locations' },
            },
            {
              name: 'municipalities',
              list: '/municipalities',
              create: '/municipalities/create',
              edit: '/municipalities/edit/:id',
              meta: { label: t('municipalities.label'), parent: 'locations' },
            },

            { name: 'content', meta: { label: t('content.label') } },
            {
              name: 'adventure-pages',
              list: '/adventure-pages',
              show: '/adventure-pages/show/:id',
              meta: { label: t('adventure-pages.label'), parent: 'content' },
            },
            {
              name: 'trip-reports',
              list: '/trip-reports',
              show: '/trip-reports/show/:id',
              meta: { label: t('trip-reports.label'), parent: 'content' },
            },
            {
              name: 'trip-groups',
              list: '/trip-groups',
              show: '/trip-groups/show/:id',
              meta: { label: t('trip-groups.label'), parent: 'content' },
            },

            { name: 'geodata', meta: { label: t('geodata.label') } },
            {
              name: 'trails',
              list: '/trails',
              show: '/trails/show/:id',
              meta: { label: t('trails.label'), parent: 'geodata' },
            },
            {
              name: 'spots',
              list: '/spots',
              show: '/spots/show/:id',
              meta: { label: t('spots.label'), parent: 'geodata' },
            },
            {
              name: 'activity-tracks',
              list: '/activity-tracks',
              show: '/activity-tracks/show/:id',
              meta: { label: t('activity-tracks.label'), parent: 'geodata' },
            },

            {
              name: 'guide-profiles',
              list: '/guide-profiles',
              show: '/guide-profiles/show/:id',
              meta: { label: t('guide-profiles.label') },
            },
            {
              name: 'users',
              list: '/users',
              edit: '/users/edit/:id',
              meta: { label: t('users.label') },
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

              <Route path="/activity-tracks">
                <Route index element={<ActivityTrackList />} />
                <Route path="show/:id" element={<ActivityTrackShow />} />
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
