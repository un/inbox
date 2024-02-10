import { H3Event, getHeader } from 'h3';
import { db } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { orgs } from '@uninbox/database/schema';
import type { OrgContext } from '@uninbox/types';
export const validateOrgSlug = async (
  event: H3Event
): Promise<OrgContext | null> => {
  const orgSlug = getHeader(event, 'org-slug');
  if (!orgSlug) {
    return null;
  }

  const cachedSlugOrgContext: OrgContext | null =
    await useStorage('org-context').getItem(orgSlug);
  if (cachedSlugOrgContext) {
    return cachedSlugOrgContext;
  }

  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.slug, orgSlug),
    columns: { id: true, publicId: true },
    with: {
      members: {
        columns: {
          id: true,
          userId: true,
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
    members: orgLookupResult.members
  };

  await useStorage('org-context').setItem(orgSlug, orgContext);
  return orgContext;
};

export async function refreshOrgSlugCache(orgId: number): Promise<void> {
  const orgLookupResult = await db.query.orgs.findFirst({
    where: eq(orgs.id, orgId),
    columns: { id: true, publicId: true, slug: true },
    with: {
      members: {
        columns: {
          id: true,
          userId: true,
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
    members: orgLookupResult.members
  };
  await useStorage('org-context').setItem(orgLookupResult.slug, orgContext);
}
