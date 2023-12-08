export default eventHandler(async (event) => {
  const session = await useAuthSession(event);
  const sessionId = session.id;
  if (sessionId) {
    await useStorage('sessions').removeItem(sessionId);
  }
  await session.clear();

  return {
    message: 'Successfully logged out!'
  };
});
