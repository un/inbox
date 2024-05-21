import type { OrgContext } from '~platform/ctx';

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
