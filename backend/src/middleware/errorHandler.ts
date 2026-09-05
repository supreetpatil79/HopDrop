import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../observability/logger';
import { captureServerError } from '../observability/sentry';
import { getMetricsRoute, httpErrorsTotal } from '../observability/metrics';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const isValidationError = err instanceof ZodError;
  const statusCode = err.statusCode || (isValidationError ? 400 : 500);
  const message = isValidationError
    ? 'Validation failed'
    : (statusCode >= 500 && process.env.NODE_ENV === 'production')
      ? 'Internal server error'
      : err.message || 'Internal server error';
  const route = getMetricsRoute(req);

  httpErrorsTotal.inc({
    method: req.method,
    route,
    status_code: String(statusCode)
  });

  const logPayload = {
    request_id: req.requestId,
    trace_id: req.traceId || null,
    span_id: req.spanId || null,
    method: req.method,
    url: req.originalUrl,
    route,
    status_code: statusCode,
    user_id: req.user?.id || null,
    error_code: isValidationError ? 'VALIDATION_ERROR' : err.code || err.name || 'INTERNAL_SERVER_ERROR',
    message,
    ...(statusCode >= 500 && { stack: err.stack })
  };

  if (statusCode >= 500) {
    logger.error(logPayload, 'request_failed');
  } else {
    logger.warn(logPayload, 'request_failed');
  }

  if (statusCode >= 500) {
    captureServerError(err, {
      request_id: req.requestId,
      trace_id: req.traceId || null,
      span_id: req.spanId || null,
      route,
      status_code: statusCode,
      user_id: req.user?.id || null
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(isValidationError && { errors: err.flatten().fieldErrors }),
    ...(process.env.NODE_ENV === 'development' && !isValidationError && { stack: err.stack })
  });
}
