export default eventHandler(async (event) => {
  console.log('✅', event.context.stripeEvent);
  sendNoContent(event, 200);

  // handle stripe events with switch statement
});
