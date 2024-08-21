import { runOrgMigration } from './migrationJob';
import { db } from '@u22n/database';
import { logger } from './logger';
import crypto from 'crypto';

async function migrateBranch(orgId: string) {
  const logFile = './logs.txt';
  logger.init(logFile);

  const org = await db.query.orgs.findFirst({
    where: (orgs, { eq }) => eq(orgs.id, parseInt(orgId, 10)),
    columns: {
      id: true,
      name: true
    }
  });

  if (!org) {
    console.error(`Organization with ID ${orgId} not found.`);
    logger.restore();
    return;
  }

  const batchDistinctId = crypto.randomBytes(4).toString('hex');

  logger.log(`Starting migration for organization ${org.name} (ID: ${org.id})`);

  try {
    await runOrgMigration({ orgId: org.id, batchDistinctId });
    logger.log(
      `Successfully migrated organization ${org.name} (ID: ${org.id})`
    );
  } catch (error) {
    logger.log(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Error migrating organization ${org.name} (ID: ${org.id}): ${error}`
    );
  }

  logger.log('Migration process completed.');
  logger.restore();
}

const orgId = process.argv[2];

if (!orgId) {
  console.error('Please provide an organization ID as an argument.');
  process.exit(1);
}

migrateBranch(orgId).catch(console.error);
