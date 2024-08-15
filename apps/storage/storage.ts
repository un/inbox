import { createStorage, type Driver, type StorageValue } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';
import { ms } from '@u22n/utils/ms';
import { env } from './env';

export type Session = {
  attributes: {
    account: { id: number; publicId: string; username: string };
  };
};

const createCachedStorage = <T extends StorageValue = StorageValue>(
  base: string,
  ttl: number
) =>
  createStorage<T>({
    driver: redisDriver({
      url: env.DB_REDIS_CONNECTION_STRING,
      ttl,
      base
    }) as Driver
  });

export const storage = {
  session: createCachedStorage<Session>(
    'sessions',
    env.NODE_ENV === 'development' ? ms('12 hours') : ms('30 days')
  )
};
