import { env } from './env';
import { ms } from 'itty-time';
import redisDriver from 'unstorage/drivers/redis';
import { createStorage } from 'unstorage';

const createCachedStorage = (base: string, ttl: number) =>
  createStorage({
    driver: redisDriver({
      url: env.DB_REDIS_CONNECTION_STRING,
      ttl,
      base
    })
  });

export const storage = {
  auth: createCachedStorage('auth', ms('5 minutes')),
  orgContext: createCachedStorage('org-context', ms('12 hours')),
  session: createCachedStorage(
    'sessions',
    env.NODE_ENV === 'development' ? ms('12 hours') : ms('30 days')
  )
};
