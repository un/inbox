import { validatePostalWebhookSignature } from '../utils/validatePostalWebhookSignature';
import type { PostalConfig } from '../types';
import {
  defineEventHandler,
  getRequestURL,
  readBody,
  getHeader,
  useRuntimeConfig,
  sendNoContent
} from '#imports';

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/postal')) {
    const body = await readBody(event);
    const signature = getHeader(event, 'x-postal-signature') || '';
    //TODO: need to support multiple public keys from multiple servers, and return true if any match
    const postalConfig: PostalConfig = useRuntimeConfig().postal;
    console.log('🔥 signature', { signature });

    const publicKeys = postalConfig.servers.map(
      (server) => server.webhookPubKey
    );
    console.log('🔥postal verify webhook', { publicKeys });

    const validPostalSignature = await validatePostalWebhookSignature(
      body,
      signature,
      publicKeys
    );
    if (!validPostalSignature) {
      sendNoContent(event, 401);
    }
    event.context.fromPostal = validPostalSignature;
  }
});
