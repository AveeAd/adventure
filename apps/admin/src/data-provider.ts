import dataProviderSimpleRest from '@refinedev/simple-rest';
import axios from 'axios';
import { API_URL } from './auth/auth-provider';
import { tokenStore } from './auth/token-store';

const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// no resources are registered yet (Phase 5) - this just satisfies Refine's
// required dataProvider prop until then
export const dataProvider = dataProviderSimpleRest(`${API_URL}/api/v1`, axiosInstance);
