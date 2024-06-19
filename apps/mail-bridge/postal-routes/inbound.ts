import { zValidator } from '@hono/zod-validator';
import {
  postalMessageSchema,
  mailParamsSchema
} from '../queue/mail-processor/schemas';
import type { Ctx } from '../ctx';
import { Hono } from 'hono';
import { mailProcessorQueue } from '../queue/mail-processor';

export const inboundApi = new Hono<Ctx>();

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
