import { Hono } from 'hono';
import type { Ctx } from '~platform/ctx';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { validateOrgShortCode } from '~platform/utils/orgShortCode';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import { orgMembers } from '@u22n/database/schema';
import { realtime } from '~platform/utils/realtime';

export const realtimeApi = new Hono<Ctx>();

realtimeApi.post(
  '/auth',
  zValidator('json', z.object({ socketId: z.string() })),
  zValidator('header', z.object({ 'org-shortcode': z.string() })),
  async (c) => {
    const accountContext = c.get('account');
    const orgContext = await validateOrgShortCode(
      c.req.valid('header')['org-shortcode']
    );

    if (!orgContext || !accountContext) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const orgMemberId = orgContext.members.find(
      (m) => m.accountId === accountContext.id
    )?.id;

    if (!orgMemberId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const orgMemberObject = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.id, orgMemberId),
        eq(orgMembers.orgId, orgContext.id)
      ),
      columns: { publicId: true }
    });

    if (!orgMemberObject) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json(
      realtime.authenticate(
        c.req.valid('json').socketId,
        orgMemberObject.publicId
      )
    );
  }
);
