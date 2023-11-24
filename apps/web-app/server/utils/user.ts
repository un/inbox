import type { OrgContext } from '@uninbox/types';

export async function isUserAdminOfOrg(orgContext: OrgContext, userId: number) {
  const userOrgMembership = orgContext?.members.find((member) => {
    return +member.userId === +userId;
  });
  if (!userOrgMembership) {
    return false;
  }
  if (
    userOrgMembership.role !== 'admin' ||
    userOrgMembership.status !== 'active'
  ) {
    return false;
  }
  return true;
}
