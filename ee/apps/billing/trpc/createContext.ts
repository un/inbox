import type { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';
import type { StripeData } from '../types';
import { db } from '@u22n/database';
import { useRuntimeConfig } from '#imports';
import { getHeader } from 'h3';
//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const config = useRuntimeConfig(event);
  const authToken = getHeader(event, 'Authorization');
  const isServiceAuthenticated = authToken === config.key;
  const stripeData: StripeData = config.stripe as StripeData;
  return { auth: isServiceAuthenticated, stripe: stripeData, db };
};

export type CreateContext = inferAsyncReturnType<typeof createContext>;
