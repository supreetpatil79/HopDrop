"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversionStepsTotal = exports.lifecycleEventsTotal = exports.consumerConnected = exports.metricsRegistry = void 0;
exports.metricsPayload = metricsPayload;
const prom_client_1 = __importDefault(require("prom-client"));
exports.metricsRegistry = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({
    register: exports.metricsRegistry,
    prefix: 'hopdrop_analytics_pipeline_'
});
exports.consumerConnected = new prom_client_1.default.Gauge({
    name: 'hopdrop_analytics_pipeline_consumer_connected',
    help: 'Whether the analytics pipeline Kafka consumer is connected'
});
exports.lifecycleEventsTotal = new prom_client_1.default.Counter({
    name: 'hopdrop_analytics_pipeline_lifecycle_events_total',
    help: 'Lifecycle events observed by topic and event type',
    labelNames: ['topic', 'event_type']
});
exports.conversionStepsTotal = new prom_client_1.default.Counter({
    name: 'hopdrop_analytics_pipeline_conversion_steps_total',
    help: 'Derived conversion steps observed from lifecycle events',
    labelNames: ['flow', 'step']
});
exports.metricsRegistry.registerMetric(exports.consumerConnected);
exports.metricsRegistry.registerMetric(exports.lifecycleEventsTotal);
exports.metricsRegistry.registerMetric(exports.conversionStepsTotal);
async function metricsPayload() {
    return exports.metricsRegistry.metrics();
}
