import redisDriver from 'unstorage/drivers/redis';
import upstashDriver from './upstashDriver';
import { defineNitroPlugin, useStorage } from '#imports';

export default defineNitroPlugin(() => {
  let useUpstash: boolean;
  if (!process.env.DB_UPSTASH_URL || !process.env.DB_UPSTASH_TOKEN) {
    useUpstash = false;
  } else {
    useUpstash = true;
  }

  const storage = useStorage();

  function getCacheDb(base: string) {
    if (useUpstash) {
      return upstashDriver({
        envPrefix: 'DB_UPSTASH',
        ttl:
          process.env.NODE_ENV === 'development'
            ? 60 * 60 * 12
            : 60 * 60 * 24 * 30,
        base: base
      });
    } else {
      return redisDriver({
        url: process.env.DB_REDIS_CONNECTION_STRING,
        ttl:
          process.env.NODE_ENV === 'development'
            ? 60 * 60 * 12
            : 60 * 60 * 24 * 30,
        base: base
      });
    }
  }

  // Mount driver
  storage.mount('sessions', getCacheDb('sessions'));
});
