import type { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';
import { db } from '@u22n/database';
import type { AccountContext } from '../../types';

//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const account: AccountContext = await event.context.account;
  return { db, account, event };
};

export type Context = inferAsyncReturnType<typeof createContext>;
