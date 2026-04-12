import axios from 'axios';
import { env } from '../config/env';

const routingSearchBaseUrl = env.ROUTING_SEARCH_URL?.replace(/\/$/, '');

export async function callRoutingSearch<T>(
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000
): Promise<T | null> {
  if (!routingSearchBaseUrl) {
    return null;
  }

  try {
    const response = await axios.post<T>(`${routingSearchBaseUrl}${path}`, payload, {
      timeout: timeoutMs
    });
    return response.data;
  } catch (_error) {
    return null;
  }
}
