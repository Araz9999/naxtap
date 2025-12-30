import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({ url });
    c.on('error', (err) => logger.error('[Redis] Client error', err));
    try {
      await c.connect();
      logger.info('[Redis] Connected');
      client = c;
      return c;
    } catch (e) {
      logger.error('[Redis] Failed to connect', e);
      try {
        await c.disconnect();
      } catch {
        // ignore
      }
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

