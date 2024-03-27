import { eventHandler, createError, readBody } from 'h3';
import { z } from 'zod';
import { realtime } from '~/realtime';
import { validateTypeId } from '@u22n/utils';

const bodySchema = z.object({
  socketId: z.string()
});

const safeBodyParse = (body: any) => {
  try {
    return bodySchema.safeParse(JSON.parse(body));
  } catch (e) {
    return { success: false, error: e } as const;
  }
};

export default eventHandler(async (event) => {
  if (!event.context.account || !event.context.account.session.id) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }
  const body = safeBodyParse(await readBody(event));
  if (!body.success) {
    throw createError({
      status: 400,
      message: 'Invalid request'
    });
  }
  const accountId =
    event.context.account.session?.attributes?.account?.publicId;

  if (!validateTypeId('account', accountId)) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }
  return realtime.authenticate(body.data.socketId, accountId);
});
