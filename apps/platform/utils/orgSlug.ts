import { H3Event, getHeader } from 'h3';
import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import type { OrgContext } from '@u22n/types';
import { useStorage } from '#imports';

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
    members: orgLookupResult.members
  };
  await useStorage('org-context').setItem(orgLookupResult.slug, orgContext);
}
