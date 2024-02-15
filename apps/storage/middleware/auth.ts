import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const sessionCookie = getCookie(event, 'unsession');
  if (!sessionCookie) {
    event.context.user = null;
    return;
  }
  const sessionStorage = useStorage('sessions');
  const sessionObject: Object | null =
    await sessionStorage.getItem(sessionCookie);
  if (!sessionObject) {
    event.context.user = null;
    return;
  }
  const userContext = {
    //@ts-ignore
    id: +sessionObject.attributes.user.id,
    session: sessionObject
  };
  event.context.user = userContext;
});
