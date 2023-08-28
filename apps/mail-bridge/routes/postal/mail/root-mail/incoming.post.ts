/**
 * used for all email messages coming to the root domains
 */

export default eventHandler((event) => {
  const mailBody = readBody(event);

  //! verify the source of webhook call: https://github.com/postalserver/postal/issues/432#issuecomment-730454586
  //! extract the to address of the email
  //! verify it was sent to a root domain
  //! extract the username from the to email address
  //! do DB lookup for the addresss

  return { status: "I'm Alive 🏝️" };
});
