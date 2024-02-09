import redisDriver from 'unstorage/drivers/redis';
import upstashDriver from './upstashDriver';

export default defineNitroPlugin(() => {
  let useUpstash: boolean;
  if (!process.env.DB_UPSTASH_URL || !process.env.DB_UPSTASH_TOKEN) {
    useUpstash = false;
  } else {
    useUpstash = true;
  }

  const storage = useStorage();

  const defaultTTL = import.meta.dev ? 60 * 60 * 24 : 60 * 60 * 24 * 28;

  function getCacheDb(base: string, ttl: number = defaultTTL) {
    if (useUpstash) {
      return upstashDriver({
        envPrefix: 'DB_UPSTASH',
        ttl: ttl,
        base: base
      });
    } else {
      return redisDriver({
        url: process.env.DB_REDIS_CONNECTION_STRING,
        ttl: ttl,
        base: base
      });
    }
  }

  // Mount driver
  storage.mount('auth', getCacheDb('auth', 60 * 5));
  storage.mount('sessions', getCacheDb('sessions'));
  storage.mount('org-context', getCacheDb('org-context', 60 * 60 * 12));
});
