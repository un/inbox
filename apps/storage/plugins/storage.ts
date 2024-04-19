import redisDriver from 'unstorage/drivers/redis';
import { defineNitroPlugin, useStorage } from '#imports';

export default defineNitroPlugin(() => {
  const storage = useStorage();

  const getCacheDb = (base: string) =>
    redisDriver({
      url: process.env.DB_REDIS_CONNECTION_STRING,
      ttl:
        process.env.NODE_ENV === 'development'
          ? 60 * 60 * 12
          : 60 * 60 * 24 * 30,
      base
    });

  storage.mount('sessions', getCacheDb('sessions'));
});
