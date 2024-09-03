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
  switch (stripeEvent.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      {
        const { orgId } = validateMetadata(stripeEvent.data.object.metadata);
        const item = stripeEvent.data.object.items.data[0];
        if (!item) {
          console.info('No item found', {
            event: stripeEvent.type,
            data: stripeEvent.data.object
          });
          return c.json(null, 200);
        }
        const price = resolveItem(item);
        await createOrUpdateBillingRecords({
          orgId,
          price,
          active: stripeEvent.data.object.status === 'active',
          deleteEvent: stripeEvent.type === 'customer.subscription.deleted',
          stripeCustomerId: stripeEvent.data.object.customer as string,
          stripeSubscriptionId: stripeEvent.data.object.id
        });
      }
      break;

    default:
      console.info('Unhandled stripe event', {
        event: stripeEvent.type
      });
      break;
  }

  return c.json(null, 200);
});

export const resolveItem = (item: Stripe.SubscriptionItem) => {
  const itemPeriod = item.plan.interval;
  if (itemPeriod === 'month') {
    return ['pro', 'monthly'] as const;
  }
  if (itemPeriod === 'year') {
    return ['pro', 'yearly'] as const;
  }
  throw new Error(`Unknown plan period ${itemPeriod}`);
};

export const validateMetadata = (
  metadata: Record<string, string | undefined>
) => {
  const { orgId, totalUsers } = metadata;
  if (!orgId || isNaN(Number(orgId))) {
    throw new Error('Invalid orgId');
  }
  if (!totalUsers || isNaN(Number(totalUsers))) {
    throw new Error('Invalid totalUsers');
  }
  return { orgId: Number(orgId), totalUsers: Number(totalUsers) };
};

type BillingRecordParams = {
  orgId: number;
  price: ReturnType<typeof resolveItem>;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  active: boolean;
  deleteEvent: boolean;
};

export const createOrUpdateBillingRecords = async ({
  active,
  deleteEvent,
  stripeCustomerId,
  orgId,
  price,
  stripeSubscriptionId
}: BillingRecordParams) => {
  // If the subscription is canceled and the event is a delete event, we need to delete the orgBilling record
  if (!active) {
    if (deleteEvent) {
      await db.delete(orgBilling).where(eq(orgBilling.orgId, orgId));
    }
    return;
  }

  const existingRecord = await db.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { id: true }
  });

  const [plan, period] = price;
  const values = {
    orgId,
    period,
    stripeCustomerId,
    stripeSubscriptionId,
    plan
  } as const;
  if (existingRecord) {
    await db
      .update(orgBilling)
      .set(values)
      .where(eq(orgBilling.id, existingRecord.id));
  } else {
    await db.insert(orgBilling).values(values);
  }
};
