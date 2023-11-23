import { defineEventHandler } from 'h3';
import { validateAuthSession } from '../utils/auth';

export default defineEventHandler(async (event) => {
  console.time('⏱️ server user context');
  const validatedSession = await validateAuthSession(event);
  event.context.user = validatedSession;
  console.timeEnd('⏱️ server user context');
});
