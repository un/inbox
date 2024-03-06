import { type CheerioAPI, load } from 'cheerio';
import blockRemoteContentInAttributes from './blockRemoteContentInAttributes';
import blockRemoteContentInStyle from './blockRemoteContentInStyle';

// This is a 1x100 transparent PNG used to replace images
// Generated using http://png-pixel.com/
// Note: using a 1x1 square results in large square empty
//       spaces in many e-mails, because only the width is
//       defined in the HTML; and the height gets scaled
//       proportionally. Thus the 1x100 ratio instead
// https://github.com/mailpile/Mailpile/blob/babc3e5c3e7dfa3326998d1628ffad5b0bbd27f5/shared-data/default-theme/html/jsapi/message/html-sandbox.js#L43-L47
const TRANSPARENT_1X100_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// What to replace remote URLs with
export type ReplacementOptions = {
  image?: string;
  other?: string;
};

/**
 * Replace all URLs that could be automatically fetched when displaying the HTML. These can be used for tracking, or can consume bandwidth.
 */
function blockRemoteContentCheerio(
  $: CheerioAPI,
  replacements: ReplacementOptions = {}
) {
  const { image = TRANSPARENT_1X100_URL, other = '#' } = replacements;

  // Block remote URLs in style tags
  blockRemoteContentInStyle($, image);
  // Block remote URLs in tags attributes
  blockRemoteContentInAttributes($, { image, other });
}

/**
 * Same as blockRemoteContentCheerio, but to be used as a standalone.
 */
function blockRemoteContent(
  html: string,
  replacements: ReplacementOptions = {}
): string {
  const $ = load(html);
  blockRemoteContentCheerio($, replacements);
  return $.html();
}

export { blockRemoteContentCheerio, blockRemoteContent };
