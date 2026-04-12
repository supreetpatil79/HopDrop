import { cacheRedis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../observability/logger';

type RealtimeTarget =
  | { type: 'user'; id: string }
  | { type: 'match'; id: string }
  | { type: 'trip'; id: string }
  | { type: 'room'; room: string }
  | { type: 'broadcast' };

type RealtimeDispatchMessage = {
  target: RealtimeTarget;
  event: string;
  payload: Record<string, unknown>;
};

export async function publishRealtimeEvent(message: RealtimeDispatchMessage): Promise<void> {
  try {
    await cacheRedis.publish(env.REALTIME_EVENT_CHANNEL, JSON.stringify(message));
  } catch (error) {
    logger.warn(
      {
        realtime_channel: env.REALTIME_EVENT_CHANNEL,
        realtime_event: message.event,
        realtime_target: message.target,
        error: String((error as Error)?.message || error || 'Failed to publish realtime event')
      },
      'realtime_event_publish_failed'
    );
  }
}
