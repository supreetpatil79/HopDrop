"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const ioredis_1 = __importDefault(require("ioredis"));
const kafkajs_1 = require("kafkajs");
const mongoose_1 = __importStar(require("mongoose"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const metrics_1 = require("./metrics");
const NotificationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: mongoose_1.Schema.Types.Mixed
}, { timestamps: true });
NotificationSchema.index({ user: 1, createdAt: -1 });
const Notification = mongoose_1.default.models.Notification || mongoose_1.default.model('Notification', NotificationSchema);
let consumer = null;
let ready = false;
const redisUrl = config_1.env.REDIS_CACHE_URL || config_1.env.REDIS_URL || 'redis://localhost:6379';
const publisher = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
function topicName(topic) {
    return config_1.env.KAFKA_TOPIC_PREFIX ? `${config_1.env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}
async function publishRealtime(payload) {
    await publisher.publish(config_1.env.REALTIME_EVENT_CHANNEL, JSON.stringify(payload));
}
async function handleMessage(topic, envelope) {
    const payload = envelope.payload || {};
    if (topic === topicName('notification.dispatch')) {
        const notification = await Notification.create({
            user: payload.userId,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            metadata: payload.metadata || {}
        });
        await publishRealtime({
            target: { type: 'user', id: String(payload.userId) },
            event: 'notification:new',
            payload: notification.toJSON()
        });
        return;
    }
    if (topic === topicName('realtime.dispatch')) {
        await publishRealtime(payload);
    }
}
const requestHandler = async (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: 'notification-consumer', status: 'ok' }));
        return;
    }
    if (req.url === '/ready') {
        const mongoReady = mongoose_1.default.connection.readyState === 1;
        const redisReady = publisher.status === 'ready';
        const isReady = ready && mongoReady && redisReady;
        res.writeHead(isReady ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            service: 'notification-consumer',
            status: isReady ? 'ready' : 'degraded'
        }));
        return;
    }
    if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': metrics_1.metricsRegistry.contentType });
        res.end(await (0, metrics_1.metricsPayload)());
        return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'not_found' }));
};
const server = http_1.default.createServer(requestHandler);
async function bootstrap() {
    await mongoose_1.default.connect(config_1.env.MONGODB_URI);
    const kafka = new kafkajs_1.Kafka({
        clientId: config_1.env.KAFKA_CLIENT_ID,
        brokers: config_1.env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
        logLevel: kafkajs_1.logLevel.NOTHING
    });
    consumer = kafka.consumer({ groupId: `${config_1.env.KAFKA_CLIENT_ID}-group` });
    await consumer.connect();
    metrics_1.consumerConnected.set(1);
    await consumer.subscribe({ topic: topicName('notification.dispatch'), fromBeginning: false });
    await consumer.subscribe({ topic: topicName('realtime.dispatch'), fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            const raw = message.value?.toString();
            if (!raw) {
                return;
            }
            let envelope;
            try {
                envelope = JSON.parse(raw);
            }
            catch (error) {
                metrics_1.messagesProcessedTotal.inc({
                    topic,
                    event_type: 'unknown',
                    outcome: 'parse_failed'
                });
                logger_1.logger.warn({
                    topic,
                    value: raw,
                    error: String(error?.message || error || 'Failed to parse Kafka message')
                }, 'notification_consumer_parse_failed');
                return;
            }
            try {
                await handleMessage(topic, envelope);
                metrics_1.messagesProcessedTotal.inc({
                    topic,
                    event_type: envelope.event_type,
                    outcome: 'dispatched'
                });
                logger_1.logger.info({
                    topic,
                    event_type: envelope.event_type,
                    aggregate_type: envelope.aggregate_type,
                    aggregate_id: envelope.aggregate_id
                }, 'notification_consumer_message_processed');
            }
            catch (error) {
                metrics_1.messagesProcessedTotal.inc({
                    topic,
                    event_type: envelope.event_type,
                    outcome: 'failed'
                });
                logger_1.logger.error({
                    topic,
                    event_type: envelope.event_type,
                    aggregate_type: envelope.aggregate_type,
                    aggregate_id: envelope.aggregate_id,
                    error: String(error?.message || error || 'Notification dispatch failed')
                }, 'notification_consumer_message_failed');
                throw error;
            }
        }
    });
    ready = true;
    server.listen(config_1.env.NOTIFICATION_CONSUMER_PORT, () => {
        logger_1.logger.info({
            port: config_1.env.NOTIFICATION_CONSUMER_PORT,
            topics: [topicName('notification.dispatch'), topicName('realtime.dispatch')]
        }, 'notification_consumer_started');
    });
}
async function shutdown() {
    ready = false;
    metrics_1.consumerConnected.set(0);
    await Promise.allSettled([
        consumer?.disconnect(),
        publisher.quit(),
        mongoose_1.default.disconnect(),
        new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        })
    ]);
}
bootstrap().catch((error) => {
    logger_1.logger.error({
        error: String(error?.message || error || 'Failed to bootstrap notification consumer')
    }, 'notification_consumer_bootstrap_failed');
    process.exit(1);
});
process.on('SIGTERM', () => {
    void shutdown();
});
process.on('SIGINT', () => {
    void shutdown();
});
