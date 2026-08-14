import type { DataProvider } from '@refinedev/core';
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

const apiUrl = `${API_URL}/api/v1`;

// Custom, not @refinedev/simple-rest: our Nest API's list contract is
// { data, total, page, pageSize } (ARCHITECTURE.md §7), not json-server's
// x-total-count-header + _start/_end convention simple-rest expects.
export const dataProvider: DataProvider = {
  getApiUrl: () => apiUrl,

  getList: async ({ resource, pagination }) => {
    // "off" (used by useSelect for dropdown options) means "give me
    // everything" - fine at Nepal's real scale (~838 location rows total)
    const page = pagination?.mode === 'off' ? 1 : (pagination?.currentPage ?? 1);
    const pageSize = pagination?.mode === 'off' ? 1000 : (pagination?.pageSize ?? 20);
    // "clubs", "threads", and "trip-groups" are resources whose flat admin
    // listing isn't at their own root - GET /clubs, GET /clubs/:clubId/threads,
    // and GET /trip-groups are all public (scoped or unscoped) lists, so the
    // ADMIN/MODERATOR listing lives at a separate static path instead.
    const ADMIN_ALL_PATHS: Record<string, string> = {
      clubs: 'clubs/admin/all',
      threads: 'threads/admin/all',
      'trip-groups': 'trip-groups/admin/all',
    };
    const path = ADMIN_ALL_PATHS[resource] ?? resource;
    const { data } = await axiosInstance.get(`${apiUrl}/${path}`, {
      params: { page, pageSize },
    });
    return { data: data.data, total: data.total };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.get(`${apiUrl}/${resource}/${id}`);
    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data } = await axiosInstance.post(`${apiUrl}/${resource}`, variables);
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await axiosInstance.patch(`${apiUrl}/${resource}/${id}`, variables);
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.delete(`${apiUrl}/${resource}/${id}`);
    return { data };
  },

  // escape hatch for actions that aren't plain list/get/create/update/delete,
  // e.g. PATCH /:id/verification-status - a sub-path, not a resource root
  custom: async ({ url, method, payload, query }) => {
    const { data } = await axiosInstance.request({ url: `${apiUrl}${url}`, method, data: payload, params: query });
    return { data };
  },
};
