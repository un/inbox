import { defineDriver, joinKeys } from 'unstorage';
import redisDriver from 'unstorage/drivers/redis';
import { Redis as Upstash, type RedisConfigNodejs } from '@upstash/redis';

// Adapted from: https://github.com/unjs/unstorage/blob/feat/upstash-redis/src/drivers/upstash.ts pre-merge and adapted to switch between redisIo and upstash clients

interface UpstashRedisOptions extends Partial<RedisConfigNodejs> {
  base?: string;
  envPrefix?: false | string;
  ttl?: number;
}

let useUpstash: boolean;
if (!process.env.DB_UPSTASH_URL || !process.env.DB_UPSTASH_TOKEN) {
  console.log(`ℹ🔥 Upstash DB ENV not configured, falling back to Redis`);
  useUpstash = false;
} else {
  useUpstash = true;
}

const upstashDriver = useUpstash
  ? defineDriver((opts: UpstashRedisOptions = {}) => {
      let upstashClient: Upstash;

      const getUpstashClient = () => {
        if (upstashClient) {
          return upstashClient;
        }
        const url = process.env.DB_UPSTASH_URL as string;
        const token = process.env.DB_UPSTASH_TOKEN as string;
        upstashClient = new Upstash({ url, token });
        return upstashClient;
      };

      const base = (opts.base || '').replace(/:$/, '');
      const p = (...keys: string[]) => joinKeys(base, ...keys);
      return {
        name: 'upstash',
        options: opts,
        async hasItem(key) {
          return Boolean(await getUpstashClient().exists(p(key)));
        },
        async getItem(key) {
          return getUpstashClient().get(p(key));
        },
        async setItem(key, value, tOptions) {
          const ttl = tOptions?.ttl ?? opts.ttl;
          await getUpstashClient().set(
            p(key),
            value,
            ttl ? { ex: ttl } : undefined
          );
        },
        async removeItem(key) {
          await getUpstashClient().del(p(key));
        },
        async getKeys(base) {
          return getUpstashClient().keys(p(base, '*'));
        },
        async clear(base) {
          const keys = await getUpstashClient().keys(p(base, '*'));
          if (keys.length === 0) {
            return;
          }
          await getUpstashClient().del(...keys);
        }
      };
    })
  : null;

export default defineNitroPlugin(() => {
  const storage = useStorage();

  let cacheDb;
  if (useUpstash && upstashDriver) {
    cacheDb = upstashDriver({
      ttl:
        process.env.NODE_ENV === 'development'
          ? 60 * 60 * 12
          : 60 * 60 * 24 * 30
    });
  } else {
    cacheDb = redisDriver({
      url: process.env.DB_REDIS_CONNECTION_STRING,
      ttl:
        process.env.NODE_ENV === 'development'
          ? 60 * 60 * 12
          : 60 * 60 * 24 * 30
    });
  }

  // Mount driver
  storage.mount('sessions', cacheDb);
  storage.mount('org-context', cacheDb);
});
