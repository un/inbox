import {
  createOrUpdateBillingRecords,
  resolveItem,
  validateMetadata
} from '../routes/stripe';
import { orgBilling, orgMembers } from '@u22n/database/schema';
import { and, eq, inArray, sql } from '@u22n/database/orm';
import { stripeSdk } from '../stripe';
import { db } from '@u22n/database';

const confirm = process.argv.includes('--confirm');

const orgBillingEntries = await db.query.orgBilling.findMany({
  columns: { orgId: true, stripeSubscriptionId: true }
});

const orphanOrgEntires: { orgId: number; subscriptionId: string }[] = [];

if (!confirm) {
  console.info('Doing a dry run, not updating any data');
}

for (const entry of orgBillingEntries) {
  console.info('Processing subscription for org', entry);

  if (!entry.stripeSubscriptionId) {
    console.info('No stripe subscription id found, skipping', {
      orgId: entry.orgId
    });
    orphanOrgEntires.push({
      orgId: entry.orgId,
      subscriptionId: 'no-subscription-id'
    });
    continue;
  }

  const subscription = await stripeSdk.subscriptions
    .retrieve(entry.stripeSubscriptionId)
    .catch(() => null);

  if (!subscription) {
    console.info('No subscription found, will delete from database', {
      orgId: entry.orgId,
      subscriptionId: entry.stripeSubscriptionId
    });
    orphanOrgEntires.push({
      orgId: entry.orgId,
      subscriptionId: entry.stripeSubscriptionId
    });
    continue;
  }

  if (subscription.status !== 'active') {
    console.info('Subscription is not active, will delete from database', {
      orgId: entry.orgId,
      subscriptionId: entry.stripeSubscriptionId
    });
    orphanOrgEntires.push({
      orgId: entry.orgId,
      subscriptionId: entry.stripeSubscriptionId
    });
    continue;
  }

  const { orgId, totalUsers } = validateMetadata(subscription.metadata);

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

  const item = subscription.items.data[0];
  if (!item) {
    console.info('No item found', {
      subscription
    });
    continue;
  }
  const price = resolveItem(item);

  if (confirm) {
    await createOrUpdateBillingRecords({
      orgId,
      price,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      active: subscription.status === 'active',
      deleteEvent: false
    });
  }
}

if (orphanOrgEntires.length > 0) {
  console.info(
    `Found ${orphanOrgEntires.length} database entries which don't have a subscription attached to them`,
    orphanOrgEntires
  );

  console.info('Deleting orphan database entries');

  if (confirm) {
    await db.delete(orgBilling).where(
      inArray(
        orgBilling.orgId,
        orphanOrgEntires.map((_) => _.orgId)
      )
    );
  }
}
