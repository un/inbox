/**
 * This endpoint is used as the webhook destination for incoming mail sent to the recovery email address domain.
 *
 */

export default eventHandler((event) => {
  const mailBody = readBody(event);

  //! Verify the source of webhook call
  //! extract the username from to email address of the mail body
  //! Verify the user requested a recovery email and get the recovery email address from redis
  //! extract the recovery code from the mail body
  //! send the recovery code to the user's recovery email address

  return { status: "I'm Alive 🏝️" };
});
