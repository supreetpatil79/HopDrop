import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { getActiveTraceContext } from '../observability/openTelemetry';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = String(req.header('x-request-id') || req.header('x-correlation-id') || crypto.randomUUID());
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const traceContext = getActiveTraceContext();
  if (traceContext) {
    req.traceId = traceContext.traceId;
    req.spanId = traceContext.spanId;
    res.setHeader('X-Trace-Id', traceContext.traceId);
  }

  next();
}

export function requireHttps(req: Request, res: Response, next: NextFunction) {
  if (!env.REQUIRE_HTTPS) {
    next();
    return;
  }

  const forwardedProto = req.header('x-forwarded-proto');
  if (req.secure || forwardedProto === 'https') {
    next();
    return;
  }

  res.status(426).json({
    success: false,
    message: 'HTTPS is required for this endpoint',
    requestId: req.requestId
  });
}
