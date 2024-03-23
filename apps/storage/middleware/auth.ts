import { defineEventHandler } from 'h3';
import { getCookie, useStorage } from '#imports';

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'unsession');
  if (!sessionCookie) {
    event.context.account = null;
    return;
  }
  const sessionStorage = useStorage('sessions');
  const sessionObject = await sessionStorage.getItem(sessionCookie);
  if (!sessionObject) {
    event.context.account = null;
    return;
  }
  const accountContext = {
    // @ts-expect-error, not typed properly yet
    id: +sessionObject.attributes.account.id,
    session: sessionObject
  };
  event.context.account = accountContext;
});
