import { env } from './env';
import { ms } from 'itty-time';
import redisDriver from 'unstorage/drivers/redis';
import { createStorage, type StorageValue } from 'unstorage';
import type { DatabaseSession } from 'lucia';
import type { OrgContext } from './ctx';

const createCachedStorage = <T extends StorageValue = StorageValue>(
  base: string,
  ttl: number
) =>
  createStorage<T>({
    driver: redisDriver({
      url: env.DB_REDIS_CONNECTION_STRING,
      ttl,
      base
    })
  });

export const storage = {
  auth: createCachedStorage('auth', ms('5 minutes')),
  orgContext: createCachedStorage<OrgContext>('org-context', ms('12 hours')),
  session: createCachedStorage<DatabaseSession>(
    'sessions',
    env.NODE_ENV === 'development' ? ms('12 hours') : ms('30 days')
  )
};
