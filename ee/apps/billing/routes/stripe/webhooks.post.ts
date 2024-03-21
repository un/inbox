import { eventHandler, sendNoContent } from '#imports';
import type { StripeBillingPeriod, StripePlanName } from './../../types';
import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgBilling } from '@u22n/database/schema';
import Stripe from 'stripe';

// const handleCheckoutSessionCompleted = async (stripeEvent: Stripe.Event) => {
//   const data = stripeEvent.data.object as Stripe.Checkout.Session;
//   const metadata = data.metadata;
//   if (metadata.product !== 'lifetime') {
//     return;
//   }
//   const userId = metadata.userId;

//   const checkoutSessionId = data.id as string;
//   const checkoutSessionResponse =
//     await useStripe().sdk.checkout.sessions.retrieve(checkoutSessionId, {
//       expand: ['line_items']
//     });

//   const lifetimeQuantity = checkoutSessionResponse.line_items.data[0].quantity;
//   console.log({ lifetimeQuantity });

//   const lifeTimeLicenceArray: {
//     publicId: string;
//     userId: number;
//     stripePaymentId: string;
//   }[] = [];
//   for (let i = 0; i < lifetimeQuantity; i++) {
//     lifeTimeLicenceArray.push({
//       publicId: nanoId(),
//       userId: +userId,
//       stripePaymentId: data.id
//     });
//   }

//   await db.insert(lifetimeLicenses).values(lifeTimeLicenceArray);
// };

const handleCustomerSubscriptionUpdated = async (stripeEvent: Stripe.Event) => {
  const data = stripeEvent.data.object as Stripe.Subscription;
  const orgsId = Number(data.metadata.orgId);
  const subId = data.id as string;
  const customerId = data.customer as string;
  const status = data.status;
  const plan = data.metadata.plan as StripePlanName;
  const period = data.metadata.period as StripeBillingPeriod;
  if (status !== 'active') {
    console.error('❌', 'Subscription not active - manual check', {
      status,
      subId
    });
    return;
  }

  if (!orgsId || !subId || !customerId || !plan || !period) {
    console.error('❌', 'Missing data', {
      orgsId,
      subId,
      customerId,
      plan,
      period
    });
    return;
  }

  const existingOrgBilling = await db.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgsId),
    columns: {
      id: true
    }
  });

  if (existingOrgBilling) {
    await db
      .update(orgBilling)
      .set({
        orgId: orgsId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        plan: plan,
        period: period
      })
      .where(eq(orgBilling.id, existingOrgBilling.id));
  } else {
    await db.insert(orgBilling).values({
      orgId: orgsId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subId,
      plan: plan,
      period: period
    });
  }
};

export default eventHandler(async (event) => {
  sendNoContent(event, 200);
  const stripeEvent = event.context.stripeEvent;

  switch (stripeEvent.type) {
    case 'customer.subscription.updated':
      handleCustomerSubscriptionUpdated(stripeEvent);
      break;
    default:
      console.error('❌', 'Unhandled stripe event', {
        event: stripeEvent.type
      });
      return;
  }
});
