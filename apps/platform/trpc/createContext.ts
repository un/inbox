import type { H3Event } from 'h3';
import { db } from '@u22n/database';
import type { OrgContext, AccountContext } from '@u22n/types';

//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const account: AccountContext = await event.context.account;
  const org: OrgContext = await event.context.org;
  return { db, account, org, event };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
