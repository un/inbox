import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { trpcCommandRouter } from '@/server/trpc';
import type { NextRequest } from 'next/server';
import { db } from '@u22n/database';

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: trpcCommandRouter,
    createContext: () => ({
      db,
      account: null,
      event: req
    })
  });
}

export { handler as GET, handler as POST };
