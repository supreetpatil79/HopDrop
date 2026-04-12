"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeSocketConnections = exports.httpRequestDurationSeconds = exports.httpRequestsTotal = exports.metricsRegistry = void 0;
exports.metricsPayload = metricsPayload;
exports.recordHttpRequest = recordHttpRequest;
const prom_client_1 = __importDefault(require("prom-client"));
exports.metricsRegistry = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({
    register: exports.metricsRegistry,
    prefix: 'hopdrop_realtime_gateway_'
});
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'hopdrop_realtime_gateway_http_requests_total',
    help: 'Total HTTP requests processed by the realtime gateway',
    labelNames: ['method', 'route', 'status_code']
});
exports.httpRequestDurationSeconds = new prom_client_1.default.Histogram({
    name: 'hopdrop_realtime_gateway_http_request_duration_seconds',
    help: 'HTTP request duration in seconds for the realtime gateway',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});
exports.activeSocketConnections = new prom_client_1.default.Gauge({
    name: 'hopdrop_realtime_gateway_active_socket_connections',
    help: 'Active Socket.IO connections on the realtime gateway'
});
exports.metricsRegistry.registerMetric(exports.httpRequestsTotal);
exports.metricsRegistry.registerMetric(exports.httpRequestDurationSeconds);
exports.metricsRegistry.registerMetric(exports.activeSocketConnections);
async function metricsPayload() {
    return exports.metricsRegistry.metrics();
}
function recordHttpRequest(method, route, statusCode, durationSeconds) {
    const labels = {
        method,
        route,
        status_code: String(statusCode)
    };
    exports.httpRequestsTotal.inc(labels);
    exports.httpRequestDurationSeconds.observe(labels, durationSeconds);
}
