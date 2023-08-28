/**
 * used for all incoming mail from Postal
 */

export default eventHandler((event) => {
  const mailBody = readBody(event);
  const serverId = event.context.params.mailServer;

  //! verify the source of webhook call: https://github.com/postalserver/postal/issues/432#issuecomment-730454586
  // extract event from body
  // forward event to handler functions

  return { status: "I'm Alive 🏝️" };
});
