export default eventHandler((event) => {
  if (process.env.NODE_ENV !== 'production') {
    sendNoContent(event, 404);
    console.log(
      { context: event.context },
      { user: event.context.user.userId }
    );
    throw new Error('Someone tried seeding DB in production');
  }

  return { status: "I'm Alive 🏝️" };
});
