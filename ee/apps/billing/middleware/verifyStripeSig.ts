import { defineEventHandler } from 'h3';
import {
  getRequestURL,
  readRawBody,
  getHeader,
  useRuntimeConfig,
  sendNoContent
} from '#imports';
//import { validateStripeSignature } from '../utils/validateStripeWebhook';

import Stripe from 'stripe';
import { useStripe } from '../utils/useStripe';

declare module 'h3' {
  interface H3EventContext {
    stripeEvent: Stripe.Event;
  }
}

export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/stripe')) {
    const body = await readRawBody(event);
    const signature = await getHeader(event, 'stripe-signature');
    const webhookKey = useRuntimeConfig().stripe.webhookKey;
    if (!body || !signature) {
      return;
    }

    let stripeEvent: Stripe.Event | undefined;

    try {
      stripeEvent = await useStripe().sdk.webhooks.constructEvent(
        body,
        signature,
        webhookKey
      );
    } catch (e) {
      console.error(e);
      sendNoContent(event, 401);
    }

    event.context.stripeEvent = stripeEvent!;
  }
});
