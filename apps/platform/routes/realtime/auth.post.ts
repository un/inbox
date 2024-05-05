import { eventHandler, createError, readBody, getHeader } from 'h3';
import { z } from 'zod';
import { realtime } from '../../utils/realtime';
import { validateTypeId } from '@u22n/utils';
import { db } from '@u22n/database';
import { and, eq } from '@u22n/database/orm';
import { orgMembers } from '@u22n/database/schema';
import type { AccountContext } from '@u22n/types';
import { validateOrgShortCode } from '../../utils/orgShortCode';

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
  const body = safeBodyParse(await readBody(event));
  if (!body.success) {
    throw createError({
      status: 400,
      message: 'Invalid request'
    });
  }

  const accountContext: AccountContext = await event.context.account;
  const orgShortCode = getHeader(event, 'org-shortcode');

  if (!orgShortCode) {
    throw createError({
      status: 400,
      message: 'Missing org-shortcode header'
    });
  }

  const orgContext = await validateOrgShortCode(orgShortCode);

  if (!orgContext || !accountContext) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }

  const orgMemberId = orgContext.members.find(
    (m) => m.accountId === accountContext.id
  )?.id;
  if (!orgMemberId) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }

  const orgMemberObject = await db.query.orgMembers.findFirst({
    where: and(
      eq(orgMembers.id, orgMemberId),
      eq(orgMembers.orgId, orgContext.id)
    ),
    columns: { publicId: true }
  });
  if (!orgMemberObject) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }

  const orgMemberPublicId = orgMemberObject?.publicId;
  if (!validateTypeId('orgMembers', orgMemberPublicId)) {
    throw createError({
      status: 403,
      message: 'Forbidden'
    });
  }
  return realtime.authenticate(body.data.socketId, orgMemberPublicId);
});
