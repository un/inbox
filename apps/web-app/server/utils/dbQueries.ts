import { db } from '@uninbox/database';
import { and, eq } from '@uninbox/database/orm';
import { orgMembers, orgs } from '@uninbox/database/schema';

// FIX: Check if this is still used and if so, update it to use the orgMembers Cache
export async function isUserInOrg({
  userId,
  orgPublicId,
  orgId
}: {
  userId: number;
  orgPublicId?: string;
  orgId?: number;
}): Promise<{ userId: number; orgId: number; role: string }> {
  if (!orgPublicId && !orgId) {
    throw new Error('No orgPublicId or orgId provided');
  }

  // TODO: cache if user is member of org
  const orgIdResponse = await db.read.query.orgMembers.findFirst({
    where: and(
      eq(
        orgMembers.orgId,
        orgId
          ? orgId
          : orgPublicId
            ? db.read
                .select({ id: orgs.id })
                .from(orgs)
                .where(eq(orgs.publicId, orgPublicId))
            : 0
      ),
      eq(orgMembers.userId, userId)
    ),
    columns: {
      orgId: true,
      role: true
    }
  });
  if (!orgIdResponse) {
    throw new Error('User not in org');
  }
  // END TODO

  return {
    userId,
    orgId: orgIdResponse.orgId,
    role: orgIdResponse.role
  };
}
