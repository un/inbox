export default eventHandler(async (event) => {
  const session = await useAuthSession(event);
  await session.clear();
  return {
    message: 'Successfully logged out!'
  };
});
