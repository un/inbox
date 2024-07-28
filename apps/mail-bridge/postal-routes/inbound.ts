import {
  postalMessageSchema,
  mailParamsSchema
} from '../queue/mail-processor/schemas';
import { mailProcessorQueue } from '../queue/mail-processor';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '../ctx';

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
