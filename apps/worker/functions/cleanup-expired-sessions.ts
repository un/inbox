import { sessions } from '@u22n/database/schema';
import { lte } from '@u22n/database/orm';
import { db } from '@u22n/database';

export async function cleanupExpiredSessions() {
  const now = performance.now();
  const { rowsAffected } = await db
    .delete(sessions)
    .where(lte(sessions.expiresAt, new Date()));
  const elapsed = performance.now() - now;
  return { removedSessions: rowsAffected, timeElapsed: elapsed };
}
