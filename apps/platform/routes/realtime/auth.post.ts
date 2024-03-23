import { eventHandler, createError, readBody } from 'h3';
import { z } from 'zod';
import { pusher } from '../../pusher';

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
  return pusher.authenticateUser(body.data.socketId, {
    id: event.context?.account?.session?.attributes?.account?.publicId
  });
});
