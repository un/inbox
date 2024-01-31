type ResponseType = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
export default eventHandler((event) => {
  if (event.context.user.id) {
    return { status: 'authenticated' as ResponseType };
  }
  return { status: 'unauthenticated' as ResponseType };
});
