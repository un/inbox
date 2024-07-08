import { zValidator } from '@hono/zod-validator';
import { db } from '@u22n/database';
import { typeIdValidator } from '@u22n/utils/typeid';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Ctx } from '~platform/ctx';
import { updateDnsRecords } from '~platform/utils/updateDnsRecords';

export const servicesApi = new Hono<Ctx>();

servicesApi.post(
  '/dns-check',
  zValidator(
    'json',
    z.object({
      orgId: z.number(),
      domainPublicId: typeIdValidator('domains')
    })
  ),
  async (c) => {
    const { orgId, domainPublicId } = c.req.valid('json');
    const results = await updateDnsRecords({ domainPublicId, orgId }, db).catch(
      (e) => ({ error: e.message })
    );
    return c.json({ results });
  }
);
