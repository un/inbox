type AuthStatusResponseType = {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
};
export default eventHandler((event): AuthStatusResponseType => {
  if (event.context.user?.id) {
    return { authStatus: 'authenticated' };
  }
  return { authStatus: 'unauthenticated' };
});
