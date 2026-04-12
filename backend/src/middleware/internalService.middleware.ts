import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function requireInternalService(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-service-token'];
  if (typeof token !== 'string' || token !== env.INTERNAL_API_TOKEN) {
    next(new ApiError(401, 'Unauthorized internal service request'));
    return;
  }

  next();
}
