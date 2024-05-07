import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import type { OrgContext } from '@u22n/types';
import { useStorage } from '#imports';

export const validateOrgShortCode = async (
  orgShortCode: string
): Promise<OrgContext | null> => {
  if (!orgShortCode) {
    return null;
  }

  const cachedShortCodeOrgContext: OrgContext | null =
    await useStorage('org-context').getItem(orgShortCode);
  if (cachedShortCodeOrgContext) {
    return cachedShortCodeOrgContext;
  }

  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.shortcode, orgShortCode),
    columns: { id: true, publicId: true, name: true },
    with: {
      members: {
        columns: {
          id: true,
          accountId: true,
          role: true,
          status: true
        }
      }
    }
  });
  if (!orgLookupResult) {
    return null;
  }

  const orgContext: OrgContext = {
    id: orgLookupResult.id,
    publicId: orgLookupResult.publicId,
    members: orgLookupResult.members,
    name: orgLookupResult.name
  };

  await useStorage('org-context').setItem(orgShortCode, orgContext);
  return orgContext;
};

export async function refreshOrgShortCodeCache(orgId: number): Promise<void> {
  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { id: true, publicId: true, shortcode: true, name: true },
    with: {
      members: {
        columns: {
          id: true,
          accountId: true,
          role: true,
          status: true
        }
      }
    }
  });
  if (!orgLookupResult) {
    return;
  }
  const orgContext: OrgContext = {
    id: orgLookupResult.id,
    publicId: orgLookupResult.publicId,
    members: orgLookupResult.members,
    name: orgLookupResult.name
  };
  await useStorage('org-context').setItem(
    orgLookupResult.shortcode,
    orgContext
  );
}
