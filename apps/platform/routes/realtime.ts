import { verifySpaceMembership } from '~platform/trpc/routers/spaceRouter/utils';
import { validateOrgShortcode } from '~platform/utils/orgShortcode';
import { realtime } from '~platform/utils/realtime';
import { validateTypeId } from '@u22n/utils/typeid';
import { orgMembers } from '@u22n/database/schema';
import { zValidator } from '@u22n/hono/helpers';
import { and, eq } from '@u22n/database/orm';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '~platform/ctx';
import { db } from '@u22n/database';
import { z } from 'zod';

export const realtimeApi = createHonoApp<Ctx>();

realtimeApi.post(
  '/auth',
  zValidator('json', z.object({ socketId: z.string() })),
  zValidator('header', z.object({ 'org-shortcode': z.string() })),
  async (c) => {
    const accountContext = c.get('account');
    const orgContext = await validateOrgShortcode(
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
      realtime.authenticateOrgMember(
        c.req.valid('json').socketId,
        orgMemberObject.publicId
      )
    );
  }
);

realtimeApi.post(
  '/authorize',
  zValidator(
    'json',
    z.object({ channelName: z.string(), socketId: z.string() })
  ),
  zValidator('header', z.object({ 'org-shortcode': z.string() })),
  async (c) => {
    const { channelName, socketId } = c.req.valid('json');
    const [visibility, type, id] = channelName.split('-');

    if (
      visibility !== 'private' ||
      type !== 'space' ||
      !validateTypeId('spaces', id)
    )
      return c.json({ error: 'Forbidden' }, 403);

    const accountContext = c.get('account');
    const orgContext = await validateOrgShortcode(
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

    const hasAccess = await verifySpaceMembership({
      orgId: orgContext.id,
      orgMemberId: orgMemberId,
      spacePublicId: id
    }).catch(() => {
      return false;
    });

    if (!hasAccess) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json(realtime.authorizeSpaceChannel(socketId, id));
  }
);
