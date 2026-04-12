import { NextFunction, Request, Response } from 'express';
import { logger } from '../observability/logger';
import { getMetricsRoute, httpRequestDurationSeconds, httpRequestsTotal } from '../observability/metrics';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = String(res.statusCode);
    const route = getMetricsRoute(req);

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode
    });
    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode
      },
      durationMs / 1000
    );

    logger.info(
      {
        request_id: req.requestId,
        trace_id: req.traceId || null,
        span_id: req.spanId || null,
        method: req.method,
        url: req.originalUrl,
        route,
        status_code: res.statusCode,
        latency_ms: Number(durationMs.toFixed(2)),
        response_bytes: res.getHeader('content-length') || 0,
        user_id: req.user?.id || null,
        ip: req.ip
      },
      'http_request'
    );
  });

  next();
}
