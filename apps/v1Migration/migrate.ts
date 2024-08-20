import { runOrgMigration } from './migrationJob';
import { db } from '@u22n/database';
import readline from 'readline';
import fs from 'fs';

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

  const logFile = './logs.txt';
  const useLogFile = await new Promise<boolean>((resolve) => {
    rl.question(`Do you want to log to ${logFile}? (Y/n): `, (answer) => {
      resolve(answer.toLowerCase() !== 'n');
    });
  });

  let logStream: fs.WriteStream | null = null;
  if (useLogFile) {
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  const log = (message: string) => {
    console.info(message);
    if (logStream) {
      logStream.write(message + '\n');
    }
  };

  for (const org of unmigratedOrgs) {
    const shouldMigrate = await new Promise<boolean>((resolve) => {
      rl.question(
        `Migrate organization ${org.name} (ID: ${org.id})? (Y/n): `,
        (answer) => {
          resolve(answer.toLowerCase() !== 'n');
        }
      );
    });

    if (shouldMigrate) {
      log(`Starting migration for organization ${org.name} (ID: ${org.id})`);
      try {
        await runOrgMigration({ orgId: org.id });
        log(`Successfully migrated organization ${org.name} (ID: ${org.id})`);
      } catch (error) {
        if (error instanceof Error) {
          log(
            `Error migrating organization ${org.name} (ID: ${org.id}): ${error.message}`
          );
        } else {
          log(
            `Error migrating organization ${org.name} (ID: ${org.id}): ${String(error)}`
          );
        }
      }
    }
  }

  log('Migration process completed.');
  if (logStream) {
    logStream.end();
  }
  rl.close();
}

cliMigrationScript().catch(console.error);
