import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../auth/auth-provider';
import { tokenStore } from '../auth/token-store';

// for cascading-select lookups (e.g. "all provinces to filter by country")
// where fetching everything client-side is simpler than teaching the API
// to filter by parent id, and is plenty fast at Nepal's real scale (~838
// location rows total)
export function useAllRows<T>(resource: string): T[] {
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    let cancelled = false;
    const token = tokenStore.get();
    axios
      .get(`${API_URL}/api/v1/${resource}`, {
        params: { page: 1, pageSize: 1000 },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setRows(res.data.data);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  return rows;
}
