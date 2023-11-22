import { H3Event, getHeader } from 'h3';
import { db } from '@uninbox/database';
import { eq } from '@uninbox/database/orm';
import { orgs } from '@uninbox/database/schema';

export const validateOrgSlug = async (event: H3Event) => {
  const orgSlug = getHeader(event, 'org-slug');
  if (!orgSlug) {
    return {
      orgId: null
    };
  }

  const cachedSlugOrgId = await useStorage('org-slugs').getItem(orgSlug);
  if (cachedSlugOrgId) {
    return {
      orgId: +cachedSlugOrgId
    };
  }

  const orgLookupResult = await db.read.query.orgs.findFirst({
    where: eq(orgs.slug, orgSlug),
    columns: { id: true }
  });
  if (!orgLookupResult) {
    return {
      orgId: null
    };
  }

  await useStorage('org-slugs').setItem(orgSlug, +orgLookupResult.id);
  return {
    orgId: +orgLookupResult.id
  };
};
