import { updateDnsRecords } from '~platform/utils/updateDnsRecords';
import { typeIdValidator } from '@u22n/utils/typeid';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '~platform/ctx';
import { db } from '@u22n/database';
import { z } from 'zod';

export const servicesApi = createHonoApp<Ctx>();

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
      (e: Error) => ({ error: e.message })
    );
    return c.json({ results });
  }
);
