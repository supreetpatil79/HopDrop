import { trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { env } from '../config/env';

let sdk: NodeSDK | null = null;
let initialized = false;

export function registerOpenTelemetry() {
  if (initialized || !env.OTEL_ENABLED || env.NODE_ENV === 'test') {
    return;
  }

  initialized = true;

  try {
    process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || env.OTEL_SERVICE_NAME;

    sdk = new NodeSDK({
      serviceName: env.OTEL_SERVICE_NAME,
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false
          }
        })
      ]
    });

    sdk.start();
  } catch (error) {
    sdk = null;
    initialized = false;
    // eslint-disable-next-line no-console
    console.error('Failed to initialize OpenTelemetry', error);
  }
}

export async function shutdownOpenTelemetry() {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to shutdown OpenTelemetry', error);
  } finally {
    sdk = null;
    initialized = false;
  }
}

export function getActiveTraceContext() {
  const activeSpan = trace.getActiveSpan();
  const spanContext = activeSpan?.spanContext();

  if (!spanContext) {
    return null;
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId
  };
}
