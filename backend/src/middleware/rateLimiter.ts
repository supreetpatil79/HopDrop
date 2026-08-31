import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env';
import { cacheRedis } from '../config/redis';

function sharedStore(prefix: string) {
  if (env.NODE_ENV === 'test') {
    return undefined;
  }

  return new RedisStore({
    prefix: `hopdrop:ratelimit:${prefix}:`,
    sendCommand: (...args: string[]) => cacheRedis.call(args[0], ...args.slice(1)) as Promise<string | number | boolean | Array<string | number>>
  });
}

const authStore = sharedStore('auth');
const userStore = sharedStore('user');
const tripStore = sharedStore('trip');
const deliveryStore = sharedStore('delivery');
const matchReadStore = sharedStore('match-read');
const matchWriteStore = sharedStore('match-write');
const mapsStore = sharedStore('maps');
const paymentStore = sharedStore('payment');
const webhookStore = sharedStore('webhook');

function userOrIpKey(req: any) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || 'anon'}`;
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.DEMO_MODE ? 500 : 30,
  store: authStore,
  keyGenerator: (req) => req.ip || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) => env.DEMO_MODE && req.path === '/demo-login'
});

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 2000 : 300,
  store: userStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const tripRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 2000 : 300,
  store: tripStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const deliveryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 2000 : 300,
  store: deliveryStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const matchReadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 10000 : 3000,
  store: matchReadStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const matchWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 2000 : 500,
  store: matchWriteStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const mapsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 3000 : 600,
  store: mapsStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 1000 : 200,
  store: paymentStore,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.DEMO_MODE ? 2000 : 600,
  store: webhookStore,
  keyGenerator: (req) => req.ip || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});
