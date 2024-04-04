import { H3Event, getHeader } from 'h3';
import { db } from '@u22n/database';
import { eq } from '@u22n/database/orm';
import { orgs } from '@u22n/database/schema';
import type { OrgContext } from '@u22n/types';
import { useStorage } from '#imports';

export const validateOrgShortcode = async (
  event: H3Event
): Promise<OrgContext | null> => {
  const orgShortcode = getHeader(event, 'org-shortcode');
  if (!orgShortcode) {
    return null;
  }

  const cachedShortcodeOrgContext: OrgContext | null =
    await useStorage('org-context').getItem(orgShortcode);
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

  await useStorage('org-context').setItem(orgShortcode, orgContext);
  return orgContext;
};

export async function refreshOrgShortcodeCache(orgId: number): Promise<void> {
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
