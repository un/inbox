import { zValidator } from '@u22n/hono/helpers';
import { db } from '@u22n/database';
import { typeIdValidator } from '@u22n/utils/typeid';
import { z } from 'zod';
import type { Ctx } from '~platform/ctx';
import { updateDnsRecords } from '~platform/utils/updateDnsRecords';
import { createHonoApp } from '@u22n/hono';

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
      (e) => ({ error: e.message })
    );
    return c.json({ results });
  }
);
