"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesProcessedTotal = exports.consumerConnected = exports.metricsRegistry = void 0;
exports.metricsPayload = metricsPayload;
const prom_client_1 = __importDefault(require("prom-client"));
exports.metricsRegistry = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({
    register: exports.metricsRegistry,
    prefix: 'hopdrop_matching_orchestrator_'
});
exports.consumerConnected = new prom_client_1.default.Gauge({
    name: 'hopdrop_matching_orchestrator_consumer_connected',
    help: 'Whether the matching orchestrator Kafka consumer is connected'
});
exports.messagesProcessedTotal = new prom_client_1.default.Counter({
    name: 'hopdrop_matching_orchestrator_messages_processed_total',
    help: 'Kafka messages processed by topic, event type, action, and outcome',
    labelNames: ['topic', 'event_type', 'action', 'outcome']
});
exports.metricsRegistry.registerMetric(exports.consumerConnected);
exports.metricsRegistry.registerMetric(exports.messagesProcessedTotal);
async function metricsPayload() {
    return exports.metricsRegistry.metrics();
}
