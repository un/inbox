import type { CheerioAPI } from 'cheerio';

/**
 * Removes ALL existing viewport-tags from the email and
 * appends the following viewport-tag to the most top-level <head> element
 * <meta name="viewport" content="width=device-width" />
 *
 * If the email does not contain a <head> element then it will be created
 * just before the viewport-tag gets appended.
 */
function enforceViewport(
  $: CheerioAPI,
  desiredViewport = '<meta name="viewport" content="width=device-width">'
) {
  const viewports = $('meta[name="viewport"]');
  const hasViewport = viewports.length > 0;

  const viewportElement = $(desiredViewport);

  if (hasViewport) {
    // remove current viewports
    viewports.each((_, el) => {
      $(el).remove();
    });
  }

  // Insert a viewport
  const head = $('head'); // Cheerio already makes sure head is present
  head.append(viewportElement);
}

export default enforceViewport;
