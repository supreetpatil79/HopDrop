import * as Sentry from '@sentry/node';
import { env } from '../config/env';

let initialized = false;

export function initServerTelemetry() {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE
  });

  initialized = true;
}

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(context || {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}
