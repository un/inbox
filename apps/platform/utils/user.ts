import type { OrgContext } from '@u22n/types';

export async function isUserAdminOfOrg(orgContext: OrgContext) {
  if (!orgContext?.memberId) return false;
  const userOrgMembership = orgContext?.members.find((member) => {
    return member.id === orgContext?.memberId;
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
