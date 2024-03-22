// import { db } from '@u22n/database';
// import { and, eq } from '@u22n/database/orm';
// import { orgMembers, orgs } from '@u22n/database/schema';
// import type { TypeId } from '@u22n/utils';
import type { OrgContext } from '@u22n/types';

// USED
export async function isAccountAdminOfOrg(orgContext: OrgContext) {
  if (!orgContext?.memberId) return false;
  const accountOrgMembership = orgContext?.members.find((member) => {
    return member.id === orgContext?.memberId;
  });
  if (!accountOrgMembership) {
    return false;
  }
  if (
    accountOrgMembership.role !== 'admin' ||
    accountOrgMembership.status !== 'active'
  ) {
    return false;
  }
  return true;
}

//! FIX: Check if this is still used and if so, update it to use the orgMembers Cache
// export async function isAccountMemberOfOrg({
//   accountId,
//   orgPublicId,
//   orgId
// }: {
//   accountId: number;
//   orgPublicId?: TypeId<'org'>;
//   orgId?: number;
// }): Promise<{ accountId: number; orgId: number; role: string }> {
//   if (!orgPublicId && !orgId) {
//     throw new Error('No orgPublicId or orgId provided');
//   }

//   // TODO: cache if user is member of org
//   const orgMembersResponse = await db.query.orgMembers.findFirst({
//     where: and(
//       eq(
//         orgMembers.orgId,
//         orgId
//           ? orgId
//           : orgPublicId
//             ? db
//                 .select({ id: orgs.id })
//                 .from(orgs)
//                 .where(eq(orgs.publicId, orgPublicId))
//             : 0
//       ),
//       eq(orgMembers.accountId, accountId)
//     ),
//     columns: {
//       orgId: true,
//       role: true
//     }
//   });
//   if (!orgMembersResponse) {
//     throw new Error('User not in org');
//   }
//   // END TODO

//   return {
//     accountId,
//     orgId: orgMembersResponse.orgId,
//     role: orgMembersResponse.role
//   };
// }
