import {
  createOrUpdateBillingRecords,
  resolvePriceItem,
  validateMetadata
} from '../routes/stripe';
import { orgBilling, orgMembers } from '@u22n/database/schema';
import { and, eq, inArray, sql } from '@u22n/database/orm';
import { stripeSdk } from '../stripe';
import { db } from '@u22n/database';

const confirm = process.argv.includes('--confirm');

const subscriptions = await stripeSdk.subscriptions.list();

const dbOrgIds = (
  await db.query.orgBilling.findMany({
    columns: { orgId: true }
  })
).map(({ orgId }) => orgId);

const listOfUpdatedOrgs: number[] = [];

if (!confirm) {
  console.info('Doing a dry run, not updating any data');
}

for (const subscription of subscriptions.data) {
  console.info('Processing subscription', subscription.id);

  const { orgId, totalUsers } = validateMetadata(subscription.metadata);
  if (listOfUpdatedOrgs.includes(orgId)) {
    console.info('Duplicate subscription, skipping', {
      id: subscription.id,
      orgId
    });
    continue;
  }
  listOfUpdatedOrgs.push(orgId);

  const activeOrgMembersCount = await db
    .select({ count: sql<string>`count(*)` })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.status, 'active')));

  const totalOrgUsers = Number(activeOrgMembersCount[0]?.count ?? '1');

  if (totalOrgUsers !== totalUsers) {
    console.info(
      'Total users mismatch between stripe and database, will update stripe',
      {
        subscriptionId: subscription.id,
        orgId,
        totalOrgUsers,
        totalUsers
      }
    );
  }

  if (confirm) {
    // Update the subscription with the new metadata, removing the old metadata
    await stripeSdk.subscriptions.update(subscription.id, {
      description: `Total users: ${totalOrgUsers}`,
      items: [
        {
          id: subscription.items.data[0]?.id,
          quantity: totalOrgUsers
        }
      ],
      proration_behavior: 'always_invoice',
      metadata: {
        orgId,
        totalUsers: totalOrgUsers
      }
    });
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.info('No price id found', {
      subscription
    });
    continue;
  }
  const price = resolvePriceItem(priceId);

  if (confirm) {
    await createOrUpdateBillingRecords({
      orgId,
      price,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      active: subscription.status === 'active'
    });
  }
}

const orphanDbEntries = dbOrgIds.filter(
  (id) => !listOfUpdatedOrgs.includes(id)
);

if (orphanDbEntries.length > 0) {
  console.info(
    `Found ${orphanDbEntries.length} database entries which don't have a subscription attached to them`,
    orphanDbEntries
  );

  console.info('Deleting orphan database entries');

  if (confirm) {
    await db
      .delete(orgBilling)
      .where(inArray(orgBilling.orgId, orphanDbEntries));
  }
}
