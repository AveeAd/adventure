export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function apiUrl(path: string): string {
  return `${API_URL}/api/v1${path}`;
}
