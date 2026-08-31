import { NextFunction, Request, Response } from 'express';
import { cacheRedis } from '../config/redis';
import { logger } from '../observability/logger';

function buildCacheKey(req: Request) {
  const userSegment = req.user?.id ? `:user:${req.user.id}` : '';
  return `route-cache:${req.method}:${req.originalUrl}${userSegment}`;
}

function applyCacheHeaders(req: Request, res: Response, ttlSeconds: number, hitOrMiss: 'HIT' | 'MISS') {
  res.setHeader('X-Cache', hitOrMiss);
  res.setHeader('Cache-Control', `${req.user?.id ? 'private' : 'public'}, max-age=${ttlSeconds}`);

  if (req.user?.id) {
    res.setHeader('Vary', 'Authorization');
  }
}

export function cacheMiddleware(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = buildCacheKey(req);

    try {
      const cached = await cacheRedis.get(cacheKey);
      if (cached) {
        applyCacheHeaders(req, res, ttlSeconds, 'HIT');
        res.json(JSON.parse(cached));
        return;
      }
    } catch (error) {
      logger.warn(
        {
          request_id: req.requestId,
          cache_key: cacheKey,
          error: error instanceof Error ? error.message : 'unknown'
        },
        'route_cache_read_failed'
      );
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        applyCacheHeaders(req, res, ttlSeconds, 'MISS');
        void cacheRedis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch((error) => {
          logger.warn(
            {
              request_id: req.requestId,
              cache_key: cacheKey,
              error: error instanceof Error ? error.message : 'unknown'
            },
            'route_cache_write_failed'
          );
        });
      }

      return originalJson(body);
    }) as Response['json'];

    next();
  };
}
