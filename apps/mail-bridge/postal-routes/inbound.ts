import {
  postalMessageSchema,
  mailParamsSchema
} from '../queue/mail-processor/schemas';
import type { Ctx } from '../ctx';
import { mailProcessorQueue } from '../queue/mail-processor';
import { createHonoApp } from '@u22n/hono';
import { zValidator } from '@u22n/hono/helpers';

export const inboundApi = createHonoApp<Ctx>();

inboundApi.post(
  '/mail/inbound/:orgId/:mailserverId',
  zValidator('json', postalMessageSchema),
  zValidator('param', mailParamsSchema),
  async (c) => {
    await mailProcessorQueue.add(`mail-processor`, {
      rawMessage: c.req.valid('json'),
      params: c.req.valid('param')
    });
    return c.text('OK', 200);
  }
);
