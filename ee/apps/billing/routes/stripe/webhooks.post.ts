import { StripeBillingPeriod, StripePlanName } from './../../types';
import { db } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { orgBilling } from '@uninbox/database/schema';
import { nanoId } from '@uninbox/utils';
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

//   await db.write.insert(lifetimeLicenses).values(lifeTimeLicenceArray);
// };

const handleCustomerSubscriptionUpdated = async (stripeEvent: Stripe.Event) => {
  const data = stripeEvent.data.object as Stripe.Subscription;
  const orgsId = Number(data.metadata.orgId);
  const subId = data.id as string;
  const customerId = data.customer as string;
  const status = data.status;
  const plan = data.metadata.plan as StripePlanName;
  const period = data.metadata.period as StripeBillingPeriod;
  console.log({ status, plan });
  if (status !== 'active') {
    console.log('❌', 'Subscription not active - manual check', {
      status,
      subId
    });
    return;
  }

  if (!orgsId || !subId || !customerId || !plan || !period) {
    console.log('❌', 'Missing data', {
      orgsId,
      subId,
      customerId,
      plan,
      period
    });
    return;
  }

  const existingOrgBilling = await db.read.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgsId),
    columns: {
      id: true
    }
  });

  if (existingOrgBilling) {
    await db.write
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
    await db.write.insert(orgBilling).values({
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
      console.log('❌', 'Unhandled stripe event', { event: stripeEvent.type });
      return;
  }
});
