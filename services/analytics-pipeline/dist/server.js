"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const kafkajs_1 = require("kafkajs");
const config_1 = require("./config");
const logger_1 = require("./logger");
const metrics_1 = require("./metrics");
let consumer = null;
let ready = false;
function topicName(topic) {
    return config_1.env.KAFKA_TOPIC_PREFIX ? `${config_1.env.KAFKA_TOPIC_PREFIX}.${topic}` : topic;
}
function recordDerivedConversion(eventType, payload) {
    if (eventType === 'DeliveryRequested') {
        metrics_1.conversionStepsTotal.inc({ flow: 'sender_activation', step: 'delivery_requested' });
    }
    if (eventType === 'DeliveryPaid') {
        metrics_1.conversionStepsTotal.inc({ flow: 'sender_activation', step: 'payment_completed' });
    }
    if (eventType === 'MatchProposed') {
        metrics_1.conversionStepsTotal.inc({ flow: 'marketplace', step: 'match_proposed' });
    }
    if (eventType === 'CarrierAccepted') {
        metrics_1.conversionStepsTotal.inc({ flow: 'marketplace', step: 'carrier_accepted' });
    }
    if (eventType === 'SenderConfirmed') {
        metrics_1.conversionStepsTotal.inc({ flow: 'marketplace', step: 'sender_confirmed' });
    }
    if (eventType === 'DeliveryCompleted' || eventType === 'PayoutCompleted') {
        metrics_1.conversionStepsTotal.inc({ flow: 'sender_activation', step: 'delivery_completed' });
    }
    if (eventType === 'TripPosted') {
        metrics_1.conversionStepsTotal.inc({ flow: 'carrier_activation', step: 'trip_posted' });
    }
    const tripFunded = eventType === 'TripUpdated' &&
        (payload.safetyDepositPaid === true ||
            payload.safety_deposit_paid === true ||
            payload?.updates?.safetyDepositPaid === true ||
            payload?.updates?.safety_deposit_paid === true);
    if (tripFunded) {
        metrics_1.conversionStepsTotal.inc({ flow: 'carrier_activation', step: 'deposit_locked' });
    }
}
const requestHandler = async (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: 'analytics-pipeline', status: 'ok' }));
        return;
    }
    if (req.url === '/ready') {
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ service: 'analytics-pipeline', status: ready ? 'ready' : 'degraded' }));
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
    for (const topic of ['trip.lifecycle', 'delivery.lifecycle', 'match.lifecycle', 'payment.lifecycle']) {
        await consumer.subscribe({ topic: topicName(topic), fromBeginning: false });
    }
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
                logger_1.logger.warn({
                    topic,
                    value: raw,
                    error: String(error?.message || error || 'Failed to parse Kafka message')
                }, 'analytics_pipeline_parse_failed');
                return;
            }
            metrics_1.lifecycleEventsTotal.inc({
                topic,
                event_type: envelope.event_type
            });
            recordDerivedConversion(envelope.event_type, envelope.payload || {});
            logger_1.logger.info({
                topic,
                event_type: envelope.event_type,
                aggregate_type: envelope.aggregate_type,
                aggregate_id: envelope.aggregate_id
            }, 'analytics_pipeline_message_processed');
        }
    });
    ready = true;
    server.listen(config_1.env.ANALYTICS_PIPELINE_PORT, () => {
        logger_1.logger.info({
            port: config_1.env.ANALYTICS_PIPELINE_PORT
        }, 'analytics_pipeline_started');
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
        error: String(error?.message || error || 'Failed to bootstrap analytics pipeline')
    }, 'analytics_pipeline_bootstrap_failed');
    process.exit(1);
});
process.on('SIGTERM', () => {
    void shutdown();
});
process.on('SIGINT', () => {
    void shutdown();
});
