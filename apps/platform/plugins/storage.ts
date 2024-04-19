import redisDriver from 'unstorage/drivers/redis';
import { defineNitroPlugin } from '#imports';
import { useStorage } from '#imports';

export default defineNitroPlugin(() => {
  const storage = useStorage();

  const defaultTTL = import.meta.dev ? 60 * 60 * 24 : 60 * 60 * 24 * 28;

  const getCacheDb = (base: string, ttl: number = defaultTTL) =>
    redisDriver({
      url: process.env.DB_REDIS_CONNECTION_STRING,
      ttl,
      base
    });

  // Mount driver
  storage.mount('auth', getCacheDb('auth', 60 * 5));
  storage.mount('sessions', getCacheDb('sessions'));
  storage.mount('org-context', getCacheDb('org-context', 60 * 60 * 12));
});
