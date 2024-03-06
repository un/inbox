import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/**
 * Disable all remote-content in styles, and replace images
 * with the given image URL.
 *
 * Non-image URLs that are replaced will no longer be valid, and ignored.
 * Dirty, but that's what we want.
 */
function blockRemoteContentInStyle($: CheerioAPI, replacementImageUrl: string) {
  // <style> tags
  $('style').each((_, styleEl) => {
    // We would have used .text() here, but there's a bug on script and style tags
    // https://github.com/cheeriojs/cheerio/issues/1050
    const styleText = $(styleEl).html() || '';

    const hasRemoteUrls = REG_STYLE_REMOTE_URLS.test(styleText);

    if (hasRemoteUrls) {
      const replacedText = replaceUrlsInStyle(styleText, replacementImageUrl);

      $(styleEl).text(replacedText);
    }
  });

  // <div style="..."> attributes
  $('[style]').each((_, styledEl: Element) => {
    const styleText = $(styledEl).attr('style');
    if (!styleText) {
      return;
    }

    const hasRemoteUrls = REG_STYLE_REMOTE_URLS.test(styleText);
    if (hasRemoteUrls) {
      const replacedText = replaceUrlsInStyle(styleText, replacementImageUrl);

      $(styledEl).attr('style', replacedText);
    }
  });
}

// https://regex101.com/r/f2SYlc/5
// Matches remote URLs in a style tag
const REG_STYLE_REMOTE_URLS =
  /((?:url\(|(?:@import\s*)(?:url\()?)["']?)(?!(data|cid):)((?:\w*:)[^'")]*)/gi;

function replaceUrlsInStyle(styleText: string, replacement: string): string {
  return styleText.replace(
    REG_STYLE_REMOTE_URLS,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (match: string, ...[prefix, capturedUrl]: string[]) => {
      // The original match is `${prefix}${capturedUrl}`
      return `${prefix}${replacement}`;
    }
  );
}

export default blockRemoteContentInStyle;
