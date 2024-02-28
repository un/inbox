import { eventHandler, setCookie, lucia } from '#imports';

export default eventHandler(async (event) => {
  if (!event.context.user || !event.context.user.session.id) {
    return { ok: true };
  }
  const sessionId = event.context.user.session.id;
  await lucia.invalidateSession(sessionId);
  const cookie = lucia.createBlankSessionCookie();
  setCookie(event, 'unsession', cookie.value, cookie.attributes);
  return { ok: true };
});
