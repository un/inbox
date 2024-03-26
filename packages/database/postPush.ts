/* eslint-disable no-console */
import { db } from '.';
import { sql } from './orm';

(async () => {
  console.log('🔥 Running post push script to fix drizzle issues');
  console.time('🪩 Post push script complete');
  await db.execute(
    sql.raw(`ALTER TABLE convo_entries DROP COLUMN email_message_id;`)
  );
  await db.execute(
    sql.raw(
      `ALTER TABLE convo_entries ADD COLUMN email_message_id varchar(255) AS (JSON_UNQUOTE(metadata-> '$.email.messageId')) STORED;`
    )
  );
  console.timeEnd('🪩 Post push script complete');
})();
