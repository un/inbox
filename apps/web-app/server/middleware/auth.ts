import { defineEventHandler } from 'h3';
import { verifyHankoEvent } from '../utils/auth';

export default defineEventHandler(async (event) => {
  event.context.hanko = await verifyHankoEvent(event).catch(() => undefined);
});
