import http from 'http';
import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import Redis from 'ioredis';
import { Server } from 'socket.io';
import { allowedOrigins, env } from './config';
import { logger } from './logger';
import { activeSocketConnections, metricsPayload, metricsRegistry, recordHttpRequest } from './metrics';

type AuthPayload = JwtPayload & {
  id: string;
  phone: string;
  roles: string[];
};

type RealtimeTarget =
  | { type: 'user'; id: string }
  | { type: 'match'; id: string }
  | { type: 'trip'; id: string }
  | { type: 'room'; room: string }
  | { type: 'broadcast' };

type RealtimeDispatchMessage = {
  origin?: string;
  target: RealtimeTarget;
  event: string;
  payload: Record<string, unknown>;
};

const instanceId = crypto.randomUUID();
const redisUrl = env.REDIS_CACHE_URL || env.REDIS_URL || 'redis://localhost:6379';
const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });

const requestHandler: http.RequestListener = async (req, res) => {
  const startedAt = process.hrtime.bigint();
  const method = req.method || 'GET';
  const path = req.url || '/';

  const sendJson = (statusCode: number, route: string, body: Record<string, unknown>) => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    recordHttpRequest(method, route, statusCode, durationSeconds);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (!req.url) {
    sendJson(404, 'unknown', { message: 'not_found' });
    return;
  }

  if (req.url === '/health') {
    sendJson(200, '/health', { service: 'realtime-gateway', status: 'ok' });
    return;
  }

  if (req.url === '/ready') {
    const redisReady = subscriber.status === 'ready' && publisher.status === 'ready';
    sendJson(redisReady ? 200 : 503, '/ready', {
      service: 'realtime-gateway',
      status: redisReady ? 'ready' : 'degraded',
      dependencies: {
        redis: redisReady ? 'ready' : 'not_ready'
      }
    });
    return;
  }

  if (req.url === '/metrics') {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    recordHttpRequest(method, '/metrics', 200, durationSeconds);
    res.writeHead(200, { 'Content-Type': metricsRegistry.contentType });
    res.end(await metricsPayload());
    return;
  }

  sendJson(404, path, { message: 'not_found' });
};

const server = http.createServer(requestHandler);
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  }
});

function resolveRoom(target: RealtimeTarget): string | null {
  if (target.type === 'user') {
    return `user:${target.id}`;
  }
  if (target.type === 'match') {
    return `match:${target.id}`;
  }
  if (target.type === 'trip') {
    return `trip:${target.id}`;
  }
  if (target.type === 'room') {
    return target.room;
  }
  return null;
}

function emitMessage(message: RealtimeDispatchMessage) {
  const room = resolveRoom(message.target);
  if (room) {
    io.to(room).emit(message.event, message.payload);
    return;
  }

  io.emit(message.event, message.payload);
}

async function publishMessage(message: Omit<RealtimeDispatchMessage, 'origin'>) {
  await publisher.publish(
    env.REALTIME_EVENT_CHANNEL,
    JSON.stringify({
      ...message,
      origin: instanceId
    } satisfies RealtimeDispatchMessage)
  );
}

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      next(new Error('Unauthorized socket connection'));
      return;
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    socket.data.user = payload;
    next();
  } catch (error) {
    next(new Error('Invalid socket token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user as AuthPayload | undefined;
  activeSocketConnections.inc();

  logger.info(
    {
      socket_id: socket.id,
      user_id: user?.id,
      client_ip: socket.handshake.address
    },
    'socket_connected'
  );

  socket.on('join:user', ({ userId }: { userId: string }) => {
    if (!user || userId !== user.id) {
      return;
    }
    socket.join(`user:${userId}`);
  });

  socket.on('join:match', ({ matchId }: { matchId: string }) => {
    if (!matchId) {
      return;
    }
    socket.join(`match:${matchId}`);
  });

  socket.on('join:trip', ({ tripId }: { tripId: string }) => {
    if (!tripId) {
      return;
    }
    socket.join(`trip:${tripId}`);
  });

  socket.on('location:update', async (payload: { matchId: string; lat: number; lng: number }) => {
    if (!payload?.matchId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
      return;
    }

    const enriched = {
      ...payload,
      at: Date.now(),
      userId: user?.id
    };

    emitMessage({
      target: { type: 'match', id: payload.matchId },
      event: 'location:update',
      payload: enriched
    });
    emitMessage({
      target: { type: 'match', id: payload.matchId },
      event: 'carrier:location',
      payload: enriched
    });

    try {
      await publishMessage({
        target: { type: 'match', id: payload.matchId },
        event: 'location:update',
        payload: enriched
      });
      await publishMessage({
        target: { type: 'match', id: payload.matchId },
        event: 'carrier:location',
        payload: enriched
      });
    } catch (error) {
      logger.warn(
        {
          socket_id: socket.id,
          match_id: payload.matchId,
          error: String((error as Error)?.message || error || 'Failed to fan out location update')
        },
        'location_update_publish_failed'
      );
    }
  });

  socket.on('disconnect', (reason) => {
    activeSocketConnections.dec();
    logger.info(
      {
        socket_id: socket.id,
        user_id: user?.id,
        reason
      },
      'socket_disconnected'
    );
  });
});

subscriber.on('message', (_channel, rawMessage) => {
  try {
    const message = JSON.parse(rawMessage) as RealtimeDispatchMessage;
    if (message.origin === instanceId) {
      return;
    }
    emitMessage(message);
  } catch (error) {
    logger.warn(
      {
        error: String((error as Error)?.message || error || 'Failed to parse realtime event'),
        message: rawMessage
      },
      'realtime_event_parse_failed'
    );
  }
});

async function bootstrap() {
  await Promise.all([
    subscriber.subscribe(env.REALTIME_EVENT_CHANNEL),
    publisher.ping()
  ]);

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        realtime_channel: env.REALTIME_EVENT_CHANNEL
      },
      'realtime_gateway_started'
    );
  });
}

async function shutdown() {
  logger.info('realtime_gateway_stopping');
  await Promise.allSettled([subscriber.quit(), publisher.quit()]);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

bootstrap().catch((error) => {
  logger.error(
    {
      error: String((error as Error)?.message || error || 'Failed to start realtime gateway')
    },
    'realtime_gateway_boot_failed'
  );
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
