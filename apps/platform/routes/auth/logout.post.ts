import { eventHandler, setCookie, lucia } from '#imports';

export default eventHandler(async (event) => {
  if (!event.context.account || !event.context.account.session.id) {
    return { ok: true };
  }
  const sessionId = event.context.account.session.id;
  await lucia.invalidateSession(sessionId);
  const cookie = lucia.createBlankSessionCookie();
  setCookie(event, 'unsession', cookie.value, cookie.attributes);
  return { ok: true };
});
