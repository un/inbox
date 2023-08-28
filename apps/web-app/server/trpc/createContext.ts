import { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';
import type { AuthH3SessionData } from '@uninbox/types/auth';
import { db } from '@uninbox/database';

//  * Creates context for an incoming request
//  * @link https://trpc.io/docs/context

export const createContext = async (event: H3Event) => {
  const session = event.context?.sessionData as AuthH3SessionData;

  return { db, session };
};

export type Context = inferAsyncReturnType<typeof createContext>;
