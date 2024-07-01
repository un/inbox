import { initTRPC } from '@trpc/server';
import SuperJSON from 'superjson';

const trpcContext = initTRPC.context().create({ transformer: SuperJSON });

// We don't need auth as Hono middleware handles it
export const procedure = trpcContext.procedure;

export const router = trpcContext.router;
