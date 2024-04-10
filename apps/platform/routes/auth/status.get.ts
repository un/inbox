import { deleteCookie, eventHandler } from '#imports';

type AuthStatusResponseType = {
  authStatus: 'authenticated' | 'unauthenticated';
};

export default eventHandler((event): AuthStatusResponseType => {
  if (!event.context.account || !event.context.account.id) {
    deleteCookie(event, 'unsession');
    return { authStatus: 'unauthenticated' };
  }
  return { authStatus: 'authenticated' };
});
