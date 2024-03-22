import { defineEventHandler } from 'h3';
import type { AccountContext } from '@u22n/types';
import type { DatabaseSession } from 'lucia';
import { getCookie, useStorage } from '#imports';

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'unsession');
  if (!sessionCookie) {
    event.context.account = null;
    return;
  }
  const sessionStorage = useStorage('sessions');
  const sessionObject: DatabaseSession | null =
    await sessionStorage.getItem(sessionCookie);
  if (!sessionObject) {
    event.context.account = null;
    return;
  }
  const accountContext: AccountContext = {
    id: sessionObject.attributes.account.id,
    session: sessionObject
  };
  event.context.account = accountContext;
});
