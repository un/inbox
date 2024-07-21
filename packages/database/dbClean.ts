/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import * as schema from './schema';
import { sql } from './orm';
import { db } from '.';

(async () => {
  console.log('🔥 Cleaning the database of all entries');
  console.time('🧼 All clean');

  const tableNames: string[] = [];

  for (const key in schema) {
    if (!key.includes('Relations')) {
      const tableName =
        // @ts-expect-error, don't care about types here
        schema[key][Symbol.for('drizzle:Name')];
      tableNames.push(tableName);
    }
  }

  // Create an array of Promises for executing the truncate statements
  const truncatePromises = tableNames.map(
    async (tableName) => await db.execute(sql.raw(`drop table ${tableName}`))
  );

  // Execute all the truncate statements concurrently
  await Promise.all(truncatePromises);

  console.timeEnd('🧼 All clean');
})();
