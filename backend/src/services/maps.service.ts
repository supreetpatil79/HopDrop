import axios from 'axios';
import { env } from '../config/env';
import { redis } from '../config/redis';

const MAPMYINDIA_BASE = 'https://apis.mapmyindia.com';

export async function geocode(query: string) {
  const res = await axios.get(`${MAPMYINDIA_BASE}/atlas/places`, {
    params: { query, region: 'IND' },
    headers: { Authorization: `Bearer ${await getMMIToken()}` }
  });

  return res.data.suggestedLocations?.[0];
}

export async function getRouteDistance(origin: [number, number], dest: [number, number]) {
  const key = env.MMI_REST_API_KEY || env.MMI_CLIENT_ID;
  const res = await axios.get(`${MAPMYINDIA_BASE}/advancedmaps/v1/${key}/route_eta/driving/`, {
    params: {
      origin: `${origin[1]},${origin[0]}`,
      destination: `${dest[1]},${dest[0]}`
    }
  });

  return {
    distanceKm: (res.data.routes?.[0]?.distance || 0) / 1000,
    etaMinutes: (res.data.routes?.[0]?.duration || 0) / 60
  };
}

async function getMMIToken(): Promise<string> {
  const cached = await redis.get('mmi:token');
  if (cached) {
    return cached;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.MMI_CLIENT_ID,
    client_secret: env.MMI_CLIENT_SECRET
  });

  const res = await axios.post('https://outpost.mapmyindia.com/api/security/oauth/token', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  await redis.setex('mmi:token', Math.max((res.data.expires_in || 3600) - 60, 60), res.data.access_token);
  return res.data.access_token;
}
