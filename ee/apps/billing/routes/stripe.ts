import { orgBilling } from '@u22n/database/schema';
import { createHonoApp } from '@u22n/hono';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import type { Ctx } from '../ctx';
import type Stripe from 'stripe';

export const stripeApi = createHonoApp<Ctx>();

stripeApi.post('/webhooks', async (c) => {
  const stripeEvent = c.get('stripeEvent');
  if (!stripeEvent) {
    return c.json({ error: 'Missing stripe event' }, 400);
  }
  if (stripeEvent.type === 'customer.subscription.updated') {
    await handleCustomerSubscriptionUpdated(stripeEvent);
  } else {
    console.info('Unhandled stripe event', {
      event: stripeEvent.type
    });
    return c.json(null, 200);
  }
});

const handleCustomerSubscriptionUpdated = async (stripeEvent: Stripe.Event) => {
  const data = stripeEvent.data.object as Stripe.Subscription;
  const orgsId = Number(data.metadata.orgId);
  const subId = data.id;
  const customerId = data.customer as string;
  const status = data.status;
  const plan = data.metadata.plan as 'starter' | 'pro';
  const period = data.metadata.period as 'monthly' | 'yearly';

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
