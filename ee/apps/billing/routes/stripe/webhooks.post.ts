import { db } from '@uninbox/database';
import { lifetimeLicenses } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
import Stripe from 'stripe';

const handleCheckoutSessionCompleted = async (stripeEvent: Stripe.Event) => {
  const data = stripeEvent.data.object as Stripe.Checkout.Session;
  const metadata = data.metadata;
  if (metadata.product !== 'lifetime') {
    return;
  }
  const userId = metadata.userId;

  const checkoutSessionId = data.id as string;
  const checkoutSessionResponse =
    await useStripe().sdk.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['line_items']
    });

  const lifetimeQuantity = checkoutSessionResponse.line_items.data[0].quantity;
  console.log({ lifetimeQuantity });

  const lifeTimeLicenceArray: {
    publicId: string;
    userId: number;
    stripePaymentId: string;
  }[] = [];
  for (let i = 0; i < lifetimeQuantity; i++) {
    lifeTimeLicenceArray.push({
      publicId: nanoId(),
      userId: +userId,
      stripePaymentId: data.id
    });
  }

  await db.write.insert(lifetimeLicenses).values(lifeTimeLicenceArray);
};

const handleCustomerSubscriptionUpdated = (stripeEvent: Stripe.Event) => {
  const data = stripeEvent.data.object as Stripe.Subscription;
  const metadata = data.metadata;
  const status = data.status;
  const plan = data.items.data[0].plan.id;
  const quantity = data.items.data[0].quantity;
  console.log({ metadata, status, plan, quantity });
};

export default eventHandler(async (event) => {
  sendNoContent(event, 200);
  const stripeEvent = event.context.stripeEvent;

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      handleCheckoutSessionCompleted(stripeEvent);
      break;
    case 'customer.subscription.updated':
      handleCustomerSubscriptionUpdated(stripeEvent);
      break;
    default:
      console.log('❌', 'Unhandled stripe event', { event: stripeEvent.type });
      return;
  }
});
