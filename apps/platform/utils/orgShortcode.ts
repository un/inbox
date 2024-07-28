import type { OrgContext } from '~platform/ctx';
import { orgs } from '@u22n/database/schema';
import { storage } from '~platform/storage';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';

export async function validateOrgShortcode(orgShortcode: string) {
  if (!orgShortcode) return null;

  const cachedShortcodeOrgContext =
    await storage.orgContext.getItem(orgShortcode);
  if (cachedShortcodeOrgContext) {
    return cachedShortcodeOrgContext;
  }

  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.shortcode, orgShortcode),
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

  await storage.orgContext.setItem(orgShortcode, orgContext);
  return orgContext;
}

export async function refreshOrgShortcodeCache(orgId: number) {
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
