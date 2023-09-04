import { defineEventHandler } from 'h3';
import { validateAuthSession } from '../utils/auth';

export default defineEventHandler(async (event) => {
  const validatedSession = await validateAuthSession(event);
  event.context.user = validatedSession;
});
