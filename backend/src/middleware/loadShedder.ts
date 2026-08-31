import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const exemptPaths = new Set(['/health', '/ready', '/metrics']);

/**
 * Protects the event loop and downstream dependencies during overload. This
 * is deliberately per-process; the ingress/HPA handles fleet-wide capacity.
 */
export function loadShedder(req: Request, res: Response, next: NextFunction) {
  if (exemptPaths.has(req.path)) {
    next();
    return;
  }

  const active = Number(res.app.get('hopdrop.inFlight') || 0);
  const limit = env.MAX_IN_FLIGHT_REQUESTS;

  if (active >= limit) {
    res.setHeader('Retry-After', '1');
    res.status(503).json({
      success: false,
      message: 'Service is temporarily busy. Please retry shortly.',
      requestId: req.requestId
    });
    return;
  }

  res.app.set('hopdrop.inFlight', active + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    res.app.set('hopdrop.inFlight', Math.max(0, Number(res.app.get('hopdrop.inFlight') || 1) - 1));
  };

  res.once('finish', release);
  res.once('close', release);
  next();
}
