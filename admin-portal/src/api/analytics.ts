import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
const TOKEN = import.meta.env.VITE_INTERNAL_API_TOKEN ?? 'hopdrop-local-internal-token';

const api = axios.create({
  baseURL: `${BASE}/api/v1/analytics`,
  headers: { 'x-internal-token': TOKEN }
});

export async function fetchAll() {
  const r = await api.get('/admin/all');
  return r.data.data as {
    summary: {
      users: { total: number; d1: number; d7: number; d30: number };
      trips: { total: number; active: number };
      deliveries: { total: number; pending: number };
      matches: { total: number; completed: number; active: number };
      conversionRate: string;
    };
    funnel: Array<{ stage: string; count: number }>;
    dwell: Array<{ page: string; avgDwellSec: number; sessions: number }>;
    trend: Array<{ date: string; signups: number }>;
  };
}
