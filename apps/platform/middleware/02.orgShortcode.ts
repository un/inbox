import { validateOrgShortcode } from '../utils/orgShortcode';
import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const orgShortcodeValidation = await validateOrgShortcode(event);
  event.context.org = orgShortcodeValidation;
});
