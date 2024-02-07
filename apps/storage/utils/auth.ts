export const loggedIn = defineRequestMiddleware(async (event) => {
  if (!event.context.user) {
    setResponseStatus(event, 401);
    return send(event, 'Unauthorized');
  }
});
export const authorizedService = defineRequestMiddleware(async (event) => {
  const authToken = await getHeader(event, 'Authorization');
  if (!authToken) {
    setResponseStatus(event, 401);
    return send(event, 'Unauthorized');
  }
  const storageKey = useRuntimeConfig().storageKey;
  if (authToken !== storageKey) {
    setResponseStatus(event, 401);
    return send(event, 'Unauthorized');
  }
});
