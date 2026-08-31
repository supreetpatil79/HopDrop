import { cacheRedis } from '../config/redis';
import { logger } from '../observability/logger';

const LOCK_TTL_SECONDS = 10; // Max time any single operation should hold the lock

/**
 * Acquire a Redis distributed lock using SET NX EX.
 * Returns the lock token (to release it later) or null if lock is already held.
 */
export async function acquireLock(key: string, ttlSeconds: number = LOCK_TTL_SECONDS): Promise<string | null> {
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  // SET key token NX EX ttl — only sets if key does not exist
  const result = await (cacheRedis as any).set(key, token, 'NX', 'EX', ttlSeconds);
  if (result === 'OK') {
    return token;
  }
  return null;
}

/**
 * Release a distributed lock — only if we still own it (token matches).
 * Uses a Lua script for atomic check-and-delete.
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  const luaScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  try {
    await (cacheRedis as any).eval(luaScript, 1, key, token);
  } catch (err) {
    logger.warn({ key, err }, 'lock_release_failed');
  }
}

/**
 * Run a function under a distributed lock.
 * Throws 409 Conflict if the lock cannot be acquired (someone else is processing).
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = LOCK_TTL_SECONDS
): Promise<T> {
  const token = await acquireLock(key, ttlSeconds);
  if (!token) {
    const err: any = new Error(`Resource is being processed. Try again in a moment. [lock:${key}]`);
    err.statusCode = 409;
    throw err;
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, token);
  }
}
