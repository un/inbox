import { load, type CheerioAPI } from "cheerio";
import removeQuotations from "./removeQuotations";
import removeTrailingWhitespace from "./removeTrailingWhitespace";
import linkify from "./linkify";
import enforceViewport from "./enforceViewport";
import { blockRemoteContentCheerio, type ReplacementOptions } from "./blockRemoteContent";
import { containsEmptyText, getTopLevelElement } from "./cheerio-utils";
import appendStyle from "./appendStyle";
import fixBrokenHtml from "./fixBrokenHtml";
import { enhanceLinks as _enhanceLinks } from "./enhanceLinks";

export interface PrepareMessageOptions {
  /** Remove quotations and signatures. Only affects the result messageHtml */
  noQuotations?: boolean;
  /** Automatically convert text links to anchor tags */
  autolink?: boolean;
  /** Fix broken links and add the href to the title tag */
  enhanceLinks?: boolean;
  /** Specific viewport to enforce. For example "<meta name="viewport" content="width=device-width">" */
  forceViewport?: string;
  /** Replace remote images with a transparent image, and replace other remote URLs with '#' */
  noRemoteContent?: boolean;
  /** Replace remote content with custom URLs */
  remoteContentReplacements?: ReplacementOptions;
  /** Append the given style to the HTML <head> */
  includeStyle?: string;
}

/**
 * Parse an HTML email and make transformation needed before displaying it to the user.
 * Returns the extracted body of the message, and the complete message for reference.
 *
 * Beside the optional, this always:
 * - Remove comments
 * - Remove scripts
 * - Remove tracking pixels
 * - Remove trailing whitespace
 */
function prepareMessage(
  emailHtml: string,
  options: PrepareMessageOptions = {},
): {
  /** The complete message. */
  completeHtml: string;
  /** The body of the message, stripped from secondary information */
  messageHtml: string;
  /** True if a quote or signature was found and stripped */
  didFindQuotation: boolean;
} {
  const {
    noQuotations = false,
    autolink = false,
    enhanceLinks = false,
    forceViewport = false,
    noRemoteContent = false,
    includeStyle = false,
    remoteContentReplacements = {},
  } = options;

  const result = {
    messageHtml: emailHtml,
    completeHtml: emailHtml,
    didFindQuotation: false,
  };

  result.completeHtml = fixBrokenHtml(result.completeHtml);
  result.messageHtml = result.completeHtml;

  if (autolink) {
    result.completeHtml = linkify(result.completeHtml);
    result.messageHtml = result.completeHtml;
  }

  const $ = load(result.completeHtml);

  // Comments are useless, better remove them
  removeComments($);
  removeScripts($);
  removeTrackers($);

  if (enhanceLinks) {
    _enhanceLinks($);
  }

  if (noRemoteContent) {
    blockRemoteContentCheerio($, remoteContentReplacements);
  }

  if (forceViewport) {
    enforceViewport($, forceViewport);
  }

  if (includeStyle) {
    appendStyle($, includeStyle);
  }

  removeTrailingWhitespace($);
  result.completeHtml = $.html();
  result.messageHtml = result.completeHtml;

  // Remove quotations
  if (noQuotations) {
    const { didFindQuotation } = removeQuotations($);

    // if the actions above have resulted in an empty body,
    // then we should not remove quotations
    if (containsEmptyText(getTopLevelElement($))) {
      // Don't remove anything.
    } else {
      result.didFindQuotation = didFindQuotation;

      removeTrailingWhitespace($);
      result.messageHtml = $.html();
    }
  }

  return result;
}

function removeTrackers($: CheerioAPI): void {
  const TRACKERS_SELECTORS = [
    // TODO: Improve by looking at inline styles as well
    'img[width="0"]',
    'img[width="1"]',
    'img[height="0"]',
    'img[height="1"]',
    'img[src*="http://mailstat.us"]',
  ];

  const query = TRACKERS_SELECTORS.join(", ");

  $(query).each((_, el) => {
    $(el).remove();
  });
}

function removeScripts($: CheerioAPI): void {
  $("script").each((_, el) => {
    $(el).remove();
  });
}

function removeComments($: CheerioAPI): void {
  $("*")
    .contents()
    .each((_, el) => {
      if (el.type === "comment") {
        $(el).remove();
      }
    });
}

export default prepareMessage;
