import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import type { OrgContext } from '~platform/ctx';
import { storage } from '~platform/storage';

export async function validateOrgShortCode(orgShortCode: string) {
  if (!orgShortCode) return null;

  const cachedShortCodeOrgContext =
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
}

export async function refreshOrgShortCodeCache(orgId: number) {
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
