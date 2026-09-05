import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function requireInternalService(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-service-token'];
  if (typeof token !== 'string') {
    next(new ApiError(401, 'Unauthorized internal service request'));
    return;
  }

  const tokenBuf = Buffer.from(token, 'utf8');
  const expectedBuf = Buffer.from(env.INTERNAL_API_TOKEN, 'utf8');

  if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    next(new ApiError(401, 'Unauthorized internal service request'));
    return;
  }

  next();
}
