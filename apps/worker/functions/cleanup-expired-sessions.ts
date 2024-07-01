import { db } from '@u22n/database';
import { lte } from '@u22n/database/orm';
import { sessions } from '@u22n/database/schema';

export async function cleanupExpiredSessions() {
  const now = performance.now();
  const { rowsAffected } = await db
    .delete(sessions)
    .where(lte(sessions.expiresAt, new Date()));
  const elapsed = performance.now() - now;
  return { removedSessions: rowsAffected, timeElapsed: elapsed };
}
