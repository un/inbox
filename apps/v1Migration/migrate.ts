import { runOrgMigration } from './migrationJob';
import { orgs } from '@u22n/database/schema';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { logger } from './logger';
import readline from 'readline';
import crypto from 'crypto';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function cliMigrationScript() {
  console.info('Welcome to the Organization Migration CLI');

  // Get username from environment variable
  const currentUser = process.env.DB_PLANETSCALE_USERNAME;
  if (!currentUser) {
    console.info(
      'Error: DB_PLANETSCALE_USERNAME environment variable is not set.'
    );
    rl.close();
    return;
  }

  const isCorrectUser = await new Promise<boolean>((resolve) => {
    rl.question(`Is ${currentUser} the correct username? (Y/n): `, (answer) => {
      resolve(answer.toLowerCase() !== 'n');
    });
  });

  if (!isCorrectUser) {
    console.info(
      'Please set the correct DB_PLANETSCALE_USERNAME environment variable.'
    );
    rl.close();
    return;
  }

  // Get organizations that haven't been migrated yet
  // We'll assume an organization is not migrated if it doesn't have a personal space for its owner
  const unmigratedOrgs = await db.query.orgs.findMany({
    /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
    where: (orgs) => eq(orgs.migratedToSpaces, false),
    columns: {
      id: true,
      name: true
    },
    with: {
      owner: {
        columns: {
          id: true
        }
      }
    }
  });

  if (unmigratedOrgs.length === 0) {
    console.info('No unmigrated organizations found.');
    rl.close();
    return;
  }

  console.info('Unmigrated organizations:');
  unmigratedOrgs.forEach((org, index) => {
    console.info(`${index + 1}. ${org.name} (ID: ${org.id})`);
  });

  // Add batch size prompt
  const batchSize = await new Promise<number>((resolve) => {
    rl.question(
      'Enter the batch size for processing (default 10): ',
      (answer) => {
        const size = parseInt(answer, 10);
        resolve(isNaN(size) ? 10 : size);
      }
    );
  });

  const logFile = './logs.txt';
  const useLogFile = await new Promise<boolean>((resolve) => {
    rl.question(`Do you want to log to ${logFile}? (Y/n): `, (answer) => {
      resolve(answer.toLowerCase() !== 'n');
    });
  });

  if (useLogFile) {
    logger.init(logFile);
  } else {
    logger.init();
  }

  // Process organizations in batches
  for (let i = 0; i < unmigratedOrgs.length; i += batchSize) {
    const batchDistinctId = crypto.randomBytes(4).toString('hex');
    const batch = unmigratedOrgs.slice(i, i + batchSize);
    const migrationPromises = batch.map(async (org) => {
      logger.log(
        `[Batch ${batchDistinctId}] Starting migration for organization ${org.name} (ID: ${org.id})`
      );
      try {
        await runOrgMigration({ orgId: org.id, batchDistinctId });
        // Mark the organization as migrated
        await db
          .update(orgs)
          .set({ migratedToSpaces: true })
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
          .where(eq(orgs.id, org.id));
        logger.log(
          `[Batch ${batchDistinctId}] Successfully migrated organization ${org.name} (ID: ${org.id}) and marked as migrated`
        );
      } catch (error) {
        logger.log(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `[Batch ${batchDistinctId}] Error migrating organization ${org.name} (ID: ${org.id}): ${error}`
        );
      }
    });

    await Promise.all(migrationPromises);
    logger.log(
      `[Batch ${batchDistinctId}] Completed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(unmigratedOrgs.length / batchSize)}`
    );
  }

  logger.log('Migration process completed.');
  logger.restore();
  rl.close();
}

cliMigrationScript().catch(console.error);
