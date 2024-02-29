import type { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';
import { db } from '@uninbox/database';
import type { OrgContext, UserContext } from '@uninbox/types';

//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const user: UserContext = await event.context.user;
  const org: OrgContext = await event.context.org;
  return { db, user, org, event };
};

export type Context = inferAsyncReturnType<typeof createContext>;
