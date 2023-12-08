import { defineEventHandler } from 'h3';
import { validateAuthSession } from '../utils/auth';
import type { UserContext } from '@uninbox/types';

export default defineEventHandler(async (event) => {
  const validatedSession = await validateAuthSession(event);
  if (!validatedSession.userId) {
    event.context.user = null;
    return;
  }
  const userContext: UserContext = {
    id: validatedSession.userId,
    session: validatedSession
  };
  event.context.user = userContext;
});
