import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';
import type { PostalConfig } from '../types';
import {
  defineEventHandler,
  getRequestURL,
  readBody,
  getHeader,
  useRuntimeConfig,
  sendNoContent,
  getHeaders
} from '#imports';

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/postal')) {
    const body = await readBody(event);
    const signature = getHeader(event, 'x-postal-signature') || '';
    //TODO: need to support multiple public keys from multiple servers, and return true if any match
    const postalConfig: PostalConfig = useRuntimeConfig().postal;

    const publicKeys = postalConfig.servers.map(
      (server) => server.webhookPubKey
    );

    const validPostalSignature = await validatePostalWebhookSignature(
      body,
      signature,
      publicKeys
    );

    if (!validPostalSignature) {
      const allheaders = getHeaders(event);
      console.error('🔥 Failed postal webhook call with these headers', {
        allheaders
      });
      console.error('🔥postal verify webhook', { publicKeys });
      console.error('🔥 signature', { signature });
      console.error('🔥', { validPostalSignature });
      event.context.fromPostal = true;
      // sendNoContent(event, 401);
    } else {
      event.context.fromPostal = validPostalSignature;
    }
  }
});
