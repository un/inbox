import { defineEventHandler } from 'h3';
import { getCookie, useStorage } from '#imports';

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'unsession');
  if (!sessionCookie) {
    event.context.user = null;
    return;
  }
  const sessionStorage = useStorage('sessions');
  const sessionObject = await sessionStorage.getItem(sessionCookie);
  if (!sessionObject) {
    event.context.user = null;
    return;
  }
  const userContext = {
    // @ts-expect-error, not typed properly yet
    id: +sessionObject.attributes.user.id,
    session: sessionObject
  };
  event.context.user = userContext;
});
