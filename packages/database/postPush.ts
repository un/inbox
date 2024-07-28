import { sql } from './orm';
import { db } from '.';

console.info('🔥 Running post push script to fix drizzle issues');
// eslint-disable-next-line no-console
console.time('🪩 Post push script complete');
await db.execute(
  sql.raw(`ALTER TABLE convo_entries DROP COLUMN email_message_id;`)
);
await db.execute(
  sql.raw(
    `ALTER TABLE convo_entries ADD COLUMN email_message_id varchar(255) AS (JSON_UNQUOTE(metadata-> '$.email.messageId')) STORED;`
  )
);
// eslint-disable-next-line no-console
console.timeEnd('🪩 Post push script complete');
