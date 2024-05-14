import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import type { OrgContext } from '../ctx';
import { storage } from '../storage';

export const validateOrgShortCode = async (orgShortCode: string) => {
  if (!orgShortCode) {
    return null;
  }

  const cachedShortCodeOrgContext: OrgContext =
    await storage.orgContext.getItem(orgShortCode);
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

  await storage.orgContext.setItem(orgShortCode, orgContext);
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
  await storage.orgContext.setItem(orgLookupResult.shortcode, orgContext);
}
