"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const axios_1 = __importDefault(require("axios"));
const kafkajs_1 = require("kafkajs");
const config_1 = require("./config");
const logger_1 = require("./logger");
const metrics_1 = require("./metrics");
let consumer = null;
let ready = false;
function topicName(topic) {
    return config_1.env.KAFKA_TOPIC_PREFIX ? `${config_1.env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}
async function triggerCoreApi(path) {
    await axios_1.default.post(`${config_1.env.CORE_API_URL.replace(/\/$/, '')}${path}`, {}, {
        timeout: 12000,
        headers: {
            'x-internal-service-token': config_1.env.INTERNAL_API_TOKEN
        }
    });
}
async function handleMessage(topic, envelope) {
    const payload = envelope.payload || {};
    if (topic === topicName('delivery.lifecycle')) {
        const requestId = payload.requestId || envelope.aggregate_id;
        if (!requestId || payload.status === 'cancelled') {
            return 'skipped';
        }
        if (['DeliveryRequested', 'DeliveryUpdated'].includes(envelope.event_type)) {
            await triggerCoreApi(`/internal/v1/matching/delivery-requests/${requestId}`);
            return 'delivery';
        }
        return 'skipped';
    }
    if (topic === topicName('payment.lifecycle')) {
        const requestId = payload.requestId || envelope.aggregate_id;
        if (envelope.event_type === 'DeliveryPaid' && requestId) {
            await triggerCoreApi(`/internal/v1/matching/delivery-requests/${requestId}`);
            return 'delivery';
        }
        return 'skipped';
    }
    if (topic === topicName('trip.lifecycle')) {
        const tripId = payload.tripId || envelope.aggregate_id;
        const safetyDepositPaid = payload.safetyDepositPaid === true ||
            payload.safety_deposit_paid === true ||
            payload?.updates?.safetyDepositPaid === true ||
            payload?.updates?.safety_deposit_paid === true;
        if (!tripId || payload.status !== 'active' || !safetyDepositPaid) {
            return 'skipped';
        }
        if (['TripPosted', 'TripUpdated'].includes(envelope.event_type)) {
            await triggerCoreApi(`/internal/v1/matching/trips/${tripId}`);
            return 'trip';
        }
    }
    return 'skipped';
}
const requestHandler = async (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: 'matching-orchestrator', status: 'ok' }));
        return;
    }
    if (req.url === '/ready') {
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: 'matching-orchestrator', status: ready ? 'ready' : 'degraded' }));
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
    const kafka = new kafkajs_1.Kafka({
        clientId: config_1.env.KAFKA_CLIENT_ID,
        brokers: config_1.env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
        logLevel: kafkajs_1.logLevel.NOTHING
    });
    consumer = kafka.consumer({ groupId: `${config_1.env.KAFKA_CLIENT_ID}-group` });
    await consumer.connect();
    metrics_1.consumerConnected.set(1);
    await consumer.subscribe({ topic: topicName('delivery.lifecycle'), fromBeginning: false });
    await consumer.subscribe({ topic: topicName('trip.lifecycle'), fromBeginning: false });
    await consumer.subscribe({ topic: topicName('payment.lifecycle'), fromBeginning: false });
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
                    action: 'parse',
                    outcome: 'failed'
                });
                logger_1.logger.warn({
                    topic,
                    value: raw,
                    error: String(error?.message || error || 'Failed to parse Kafka message')
                }, 'matching_orchestrator_parse_failed');
                return;
            }
            try {
                const action = await handleMessage(topic, envelope);
                metrics_1.messagesProcessedTotal.inc({
                    topic,
                    event_type: envelope.event_type,
                    action,
                    outcome: action === 'skipped' ? 'skipped' : 'triggered'
                });
                logger_1.logger.info({
                    topic,
                    event_type: envelope.event_type,
                    aggregate_type: envelope.aggregate_type,
                    aggregate_id: envelope.aggregate_id,
                    action
                }, 'matching_orchestrator_message_processed');
            }
            catch (error) {
                metrics_1.messagesProcessedTotal.inc({
                    topic,
                    event_type: envelope.event_type,
                    action: 'dispatch',
                    outcome: 'failed'
                });
                logger_1.logger.error({
                    topic,
                    event_type: envelope.event_type,
                    aggregate_type: envelope.aggregate_type,
                    aggregate_id: envelope.aggregate_id,
                    error: String(error?.message || error || 'Matching orchestration failed')
                }, 'matching_orchestrator_message_failed');
                throw error;
            }
        }
    });
    ready = true;
    server.listen(config_1.env.MATCHING_ORCHESTRATOR_PORT, () => {
        logger_1.logger.info({
            port: config_1.env.MATCHING_ORCHESTRATOR_PORT,
            topics: [topicName('delivery.lifecycle'), topicName('trip.lifecycle'), topicName('payment.lifecycle')]
        }, 'matching_orchestrator_started');
    });
}
async function shutdown() {
    ready = false;
    metrics_1.consumerConnected.set(0);
    await Promise.allSettled([
        consumer?.disconnect(),
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
        error: String(error?.message || error || 'Failed to bootstrap matching orchestrator')
    }, 'matching_orchestrator_bootstrap_failed');
    process.exit(1);
});
process.on('SIGTERM', () => {
    void shutdown();
});
process.on('SIGINT', () => {
    void shutdown();
});
