import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../observability/logger';

const routingSearchBaseUrl = env.ROUTING_SEARCH_URL?.replace(/\/$/, '');

export async function callRoutingSearch<T>(
  path: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000,
  requestId?: string
): Promise<T | null> {
  if (!routingSearchBaseUrl) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (requestId) {
      headers['X-Request-Id'] = requestId;
    }

    const response = await axios.post<T>(`${routingSearchBaseUrl}${path}`, payload, {
      timeout: timeoutMs,
      headers
    });
    return response.data;
  } catch (error: any) {
    const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
    const isUnreachable = error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';

    logger.warn(
      {
        routing_search_url: routingSearchBaseUrl,
        path,
        error_code: error?.code,
        error_message: String(error?.message || error || 'routing-search call failed'),
        is_timeout: isTimeout,
        is_unreachable: isUnreachable
      },
      'routing_search_call_failed'
    );
    return null;
  }
}
