/**
 * used for all event notifications from Postal
 */

import { eventHandler, readBody } from '#imports';

export default eventHandler((event) => {
  const _mailBody = readBody(event);
  const _serverId = event.context.params?.mailServer;

  //! verify the source of webhook call: https://github.com/postalserver/postal/issues/432#issuecomment-730454586
  // extract event from body
  // forward event to handler functions

  return { status: "I'm Alive 🏝️" };
});
