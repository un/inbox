type AuthStatusResponseType = {
  authStatus: 'authenticated' | 'unauthenticated';
};
export default eventHandler((event): AuthStatusResponseType => {
  if (!event.context.user || !event.context.user.id) {
    return { authStatus: 'unauthenticated' };
  }
  return { authStatus: 'authenticated' };
});
