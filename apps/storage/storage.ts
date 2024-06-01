import redisDriver from 'unstorage/drivers/redis';
import { env } from './env';
import { createStorage, type Driver } from 'unstorage';

const redisStorage = redisDriver({
  url: env.DB_REDIS_CONNECTION_STRING,
  ttl: env.NODE_ENV === 'development' ? 60 * 60 * 12 : 60 * 60 * 24 * 30,
  base: 'sessions'
}) as Driver; // For some reason the types are wrong

export const storage = createStorage<{ attributes: any }>({
  driver: redisStorage
});
