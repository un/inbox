import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/postal')) {
    const body = await readBody(event);
    const signature = getHeader(event, 'x-postal-signature');
    //TODO: need to support multiple public keys from multiple servers, and return true if any match
    const publicKey = useRuntimeConfig().postalWebhookPublicKey;
    const validPostalSignature = await validatePostalWebhookSignature(
      body,
      signature,
      publicKey
    );
    if (!validPostalSignature) {
      sendNoContent(event, 401);
    }
    event.context.fromPostal = validPostalSignature;
  }
});
