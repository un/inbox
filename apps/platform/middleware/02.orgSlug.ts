import { validateOrgSlug } from '~/utils/orgSlug';
//import { validateOrgSlug } from '~/utils/orgSlug';
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const orgSlugValidation = await validateOrgSlug(event);
  event.context.org = orgSlugValidation;
});
