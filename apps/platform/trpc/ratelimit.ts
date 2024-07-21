import {
  NoopRatelimit,
  Ratelimit,
  type RatelimitConfig
} from '@unkey/ratelimit';
import type { TrpcContext } from '~platform/ctx';
import { getTracer } from '@u22n/otel/helpers';
import { TRPCError } from '@trpc/server';
import { trpcContext } from './trpc';
import { env } from '~platform/env';

export const ipIdentifier = (ctx: TrpcContext) =>
  `ip:${ctx.event.env.incoming.socket.remoteAddress ?? 'unknown'}`;
export const accountIdentifier = (ctx: TrpcContext) =>
  `account:${ctx.account?.id}`;
export const orgIdentifier = (ctx: TrpcContext) => `org:${ctx.org?.id}`;

const cachedLimiters = new Map<string, Ratelimit | NoopRatelimit>();

const ratelimitTracer = getTracer('platform/trpc/ratelimit');

type RatelimiterConfig = {
  /**
   * Number of requests allowed
   */
  limit: number;
  /**
   * Duration of the rate limit window
   * @default '1h'
   */
  duration?: RatelimitConfig['duration'];
  /**
   * Namespace for the rate limit
   */
  namespace: RatelimitConfig['namespace'];
  /**
   * Function to create the identifier for the rate limit
   * @default ipIdentifier
   */
  createIdentifier?: (ctx: TrpcContext) => string;
};

export const ratelimiter = ({
  limit,
  duration = '1h',
  namespace = 'public-functions',
  createIdentifier = ipIdentifier
}: RatelimiterConfig) =>
  trpcContext.middleware(async ({ ctx, path, next }) =>
    ratelimitTracer.startActiveSpan(`TRPC Ratelimit ${path}`, async (span) => {
      let limiter = cachedLimiters.get(path);

      if (!limiter) {
        limiter = env.UNKEY_ROOT_KEY
          ? new Ratelimit({
              async: true,
              namespace,
              limit,
              duration,
              rootKey: env.UNKEY_ROOT_KEY
            })
          : new NoopRatelimit();
        cachedLimiters.set(path, limiter);
      }

      span?.addEvent('ratelimit.start');

      const identifier = createIdentifier(ctx);
      const result = await limiter.limit(identifier);

      span?.setAttributes({
        'ratelimit.identifier': identifier,
        'ratelimit.success': result.success,
        'ratelimit.remaining': result.remaining,
        'ratelimit.reset': result.reset
      });

      span?.addEvent('ratelimit.end');
      if (result.success) {
        return next();
      } else {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests, try again in ${Math.floor((result.reset - Date.now()) / 1000)} seconds`
        });
      }
    })
  );
