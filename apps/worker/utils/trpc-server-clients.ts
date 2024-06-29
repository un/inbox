import { loggerLink } from '@trpc/client';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import SuperJSON from 'superjson';
import type { TrpcMailBridgeRouter } from '@u22n/mail-bridge/trpc';
import { env } from '../env';

export const mailBridgeTrpcClient = createTRPCClient<TrpcMailBridgeRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        env.NODE_ENV === 'development' &&
        opts.direction === 'down' &&
        opts.result instanceof Error
    }),
    httpBatchLink({
      url: `${env.MAILBRIDGE_URL}/trpc`,
      transformer: SuperJSON,
      maxURLLength: 2083,
      headers() {
        return {
          Authorization: env.MAILBRIDGE_KEY
        };
      }
    })
  ]
});
