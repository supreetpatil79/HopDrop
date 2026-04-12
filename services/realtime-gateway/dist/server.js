"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ioredis_1 = __importDefault(require("ioredis"));
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const logger_1 = require("./logger");
const metrics_1 = require("./metrics");
const instanceId = crypto_1.default.randomUUID();
const redisUrl = config_1.env.REDIS_CACHE_URL || config_1.env.REDIS_URL || 'redis://localhost:6379';
const subscriber = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
const publisher = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
const requestHandler = async (req, res) => {
    const startedAt = process.hrtime.bigint();
    const method = req.method || 'GET';
    const path = req.url || '/';
    const sendJson = (statusCode, route, body) => {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        (0, metrics_1.recordHttpRequest)(method, route, statusCode, durationSeconds);
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
        (0, metrics_1.recordHttpRequest)(method, '/metrics', 200, durationSeconds);
        res.writeHead(200, { 'Content-Type': metrics_1.metricsRegistry.contentType });
        res.end(await (0, metrics_1.metricsPayload)());
        return;
    }
    sendJson(404, path, { message: 'not_found' });
};
const server = http_1.default.createServer(requestHandler);
const io = new socket_io_1.Server(server, {
    path: '/socket.io',
    cors: {
        origin: config_1.allowedOrigins.length ? config_1.allowedOrigins : true,
        credentials: true
    }
});
function resolveRoom(target) {
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
function emitMessage(message) {
    const room = resolveRoom(message.target);
    if (room) {
        io.to(room).emit(message.event, message.payload);
        return;
    }
    io.emit(message.event, message.payload);
}
async function publishMessage(message) {
    await publisher.publish(config_1.env.REALTIME_EVENT_CHANNEL, JSON.stringify({
        ...message,
        origin: instanceId
    }));
}
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            next(new Error('Unauthorized socket connection'));
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, config_1.env.JWT_ACCESS_SECRET);
        socket.data.user = payload;
        next();
    }
    catch (error) {
        next(new Error('Invalid socket token'));
    }
});
io.on('connection', (socket) => {
    const user = socket.data.user;
    metrics_1.activeSocketConnections.inc();
    logger_1.logger.info({
        socket_id: socket.id,
        user_id: user?.id,
        client_ip: socket.handshake.address
    }, 'socket_connected');
    socket.on('join:user', ({ userId }) => {
        if (!user || userId !== user.id) {
            return;
        }
        socket.join(`user:${userId}`);
    });
    socket.on('join:match', ({ matchId }) => {
        if (!matchId) {
            return;
        }
        socket.join(`match:${matchId}`);
    });
    socket.on('join:trip', ({ tripId }) => {
        if (!tripId) {
            return;
        }
        socket.join(`trip:${tripId}`);
    });
    socket.on('location:update', async (payload) => {
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
        }
        catch (error) {
            logger_1.logger.warn({
                socket_id: socket.id,
                match_id: payload.matchId,
                error: String(error?.message || error || 'Failed to fan out location update')
            }, 'location_update_publish_failed');
        }
    });
    socket.on('disconnect', (reason) => {
        metrics_1.activeSocketConnections.dec();
        logger_1.logger.info({
            socket_id: socket.id,
            user_id: user?.id,
            reason
        }, 'socket_disconnected');
    });
});
subscriber.on('message', (_channel, rawMessage) => {
    try {
        const message = JSON.parse(rawMessage);
        if (message.origin === instanceId) {
            return;
        }
        emitMessage(message);
    }
    catch (error) {
        logger_1.logger.warn({
            error: String(error?.message || error || 'Failed to parse realtime event'),
            message: rawMessage
        }, 'realtime_event_parse_failed');
    }
});
async function bootstrap() {
    await Promise.all([
        subscriber.subscribe(config_1.env.REALTIME_EVENT_CHANNEL),
        publisher.ping()
    ]);
    server.listen(config_1.env.PORT, () => {
        logger_1.logger.info({
            port: config_1.env.PORT,
            realtime_channel: config_1.env.REALTIME_EVENT_CHANNEL
        }, 'realtime_gateway_started');
    });
}
async function shutdown() {
    logger_1.logger.info('realtime_gateway_stopping');
    await Promise.allSettled([subscriber.quit(), publisher.quit()]);
    await new Promise((resolve, reject) => {
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
    logger_1.logger.error({
        error: String(error?.message || error || 'Failed to start realtime gateway')
    }, 'realtime_gateway_boot_failed');
    process.exit(1);
});
process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0));
});
process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
});
