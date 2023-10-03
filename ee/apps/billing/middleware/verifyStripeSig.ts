//import { validateStripeSignature } from '../utils/validateStripeWebhook';

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/stripe')) {
    const body = await readBody(event);
    const signature = await getHeader(event, 'x-postal-signature');
    //TODO: need to support multiple public keys from multiple servers, and return true if any match
    const publicKey = useRuntimeConfig().postalWebhookPublicKey;
    const validStripeSignature = await validateStripeWebhookSignature(
      body,
      signature,
      publicKey
    );
    if (!validStripeSignature) {
      sendNoContent(event, 401);
    }
    event.context.fromStripe = validStripeSignature;
  }
});
