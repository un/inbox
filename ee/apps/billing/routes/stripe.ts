import { orgBilling } from '@u22n/database/schema';
import { createHonoApp } from '@u22n/hono';
import { eq } from '@u22n/database/orm';
import { stripeData } from '../stripe';
import { db } from '@u22n/database';
import type { Ctx } from '../ctx';

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
        const priceId = stripeEvent.data.object.items.data[0]?.price.id;
        if (!priceId) {
          console.info('No price id found', {
            event: stripeEvent.type,
            data: stripeEvent.data.object
          });
          return c.json(null, 200);
        }
        const price = resolvePriceItem(priceId);
        await createOrUpdateBillingRecords({
          orgId,
          price,
          active: stripeEvent.data.object.status === 'active',
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

export const resolvePriceItem = (id: string) => {
  switch (id) {
    case stripeData.plans.pro.monthly:
      return ['pro', 'monthly'] as const;
    case stripeData.plans.pro.yearly:
      return ['pro', 'yearly'] as const;
    default:
      throw new Error(`Unknown plan ${id}`);
  }
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
  price: ReturnType<typeof resolvePriceItem>;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  active: boolean;
};

export const createOrUpdateBillingRecords = async ({
  active,
  stripeCustomerId,
  orgId,
  price,
  stripeSubscriptionId
}: BillingRecordParams) => {
  const existingRecord = await db.query.orgBilling.findFirst({
    where: eq(orgBilling.orgId, orgId),
    columns: { id: true }
  });

  // If the subscription is canceled, we need to delete the orgBilling record
  if (!active) {
    await db.delete(orgBilling).where(eq(orgBilling.orgId, orgId));
    return;
  }

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
