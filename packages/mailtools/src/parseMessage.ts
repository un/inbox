import { load, type CheerioAPI } from 'cheerio';
import removeQuotations from './removeQuotations';
import removeTrailingWhitespace from './removeTrailingWhitespace';
import linkify from './linkify';
import enforceViewport from './enforceViewport';
import {
  blockRemoteContentCheerio,
  type ReplacementOptions
} from './blockRemoteContent';
import { containsEmptyText, getTopLevelElement } from './cheerio-utils';
import appendStyle from './appendStyle';
import fixBrokenHtml from './fixBrokenHtml';
import { enhanceLinks as _enhanceLinks } from './enhanceLinks';
import removeStyles from './removeStyles';
import removeSignatures from './removeSignatures';

export interface ParseMessageOptions {
  /** Remove quotations. Only affects the result messageHtml */
  cleanQuotations?: boolean;
  /** Remove and return signatures. Only affects the result messageHtml */
  cleanSignatures?: boolean;
  /** Automatically convert text links to anchor tags */
  autolink?: boolean;
  /** Fix broken links and add the href to the title tag */
  enhanceLinks?: boolean;
  /** Specific viewport to enforce. For example "<meta name="viewport" content="width=device-width">" */
  forceViewport?: false | string;
  /** Replace remote images with a transparent image, and replace other remote URLs with '#' */
  noRemoteContent?: boolean;
  /** Replace remote content with custom URLs */
  remoteContentReplacements?: ReplacementOptions;
  /** Append the given style to the HTML <head> */
  includeStyle?: false | string;
  /** Remove specific styles that could affect the rendering of the html */
  cleanStyles?: boolean | string[];
}

/**
 * Parse an HTML email and make transformation needed before returning it.
 * Returns the extracted body of the message, and the complete message for reference.
 *
 * Beside the optional, this always:
 * - Remove comments
 * - Remove scripts
 * - Remove tracking pixels
 * - Remove trailing whitespace
 */
export async function parseMessage(
  emailHtml: string,
  options: ParseMessageOptions = {}
): Promise<{
  /** The original complete message. */
  completeHtml: string;
  /** The body of the message, stripped from secondary information */
  parsedMessageHtml: string;
  /** True if a quote or signature was found and stripped */
  didFindQuotation: boolean | null;
  /** True if a signature was found and stripped */
  didFindSignature: boolean | null;
  /** The signature in plain text */
  foundSignaturePlainText: string | null;
  /** The signature in HTML */
  foundSignatureHtml: string | null;
}> {
  const {
    cleanQuotations = false,
    cleanSignatures = false,
    autolink = false,
    enhanceLinks = false,
    forceViewport = false,
    noRemoteContent = false,
    includeStyle = false,
    cleanStyles = false,
    remoteContentReplacements = {}
  } = options;

  const result = {
    completeHtml: emailHtml,
    parsedMessageHtml: emailHtml,
    didFindQuotation: null as boolean | null,
    didFindSignature: null as boolean | null,
    foundSignaturePlainText: null as string | null,
    foundSignatureHtml: null as string | null
  };

  result.completeHtml = fixBrokenHtml(result.completeHtml);
  result.parsedMessageHtml = result.completeHtml;

  if (autolink) {
    result.completeHtml = linkify(result.completeHtml);
    result.parsedMessageHtml = result.completeHtml;
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
  if (cleanStyles) {
    if (typeof cleanStyles !== 'boolean') {
      removeStyles($, cleanStyles);
    }
    removeStyles($);
  }

  removeTrailingWhitespace($);
  result.completeHtml = $.html();
  result.parsedMessageHtml = result.completeHtml;

  // extract and return the signatures
  if (cleanSignatures) {
    const { didFindSignature, foundSignatureHtml, foundSignaturePlainText } =
      removeSignatures($, cleanQuotations);

    result.didFindSignature = didFindSignature;
    result.foundSignatureHtml = foundSignatureHtml;
    result.foundSignaturePlainText = foundSignaturePlainText;
    // if the actions above have resulted in an empty body,
    // then we should not remove quotations
    if (containsEmptyText(getTopLevelElement($))) {
      // Don't remove anything.
    } else {
      removeTrailingWhitespace($);
      result.parsedMessageHtml = $.html();
    }
  }

  // Remove quotations
  if (cleanQuotations) {
    const { didFindQuotation } = removeQuotations($);

    // if the actions above have resulted in an empty body,
    // then we should not remove quotations
    if (containsEmptyText(getTopLevelElement($))) {
      // Don't remove anything.
    } else {
      result.didFindQuotation = didFindQuotation;

      removeTrailingWhitespace($);
      result.parsedMessageHtml = $.html();
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
    'img[height="1"]'
  ];

  // From Mailspring's list
  const trackingUrls = [
    'click.ngpvan.com',
    't.signaux',
    't.senal',
    't.sidekickopen',
    't.sigopn',
    'bl-1.com',
    'mailstat.us/tr',
    'tracking.cirrusinsight.com',
    'app.yesware.com',
    't.yesware.com',
    'mailfoogae.appspot.com',
    'launchbit.com/taz-pixel',
    'list-manage.com/track',
    'cmail1.com/t',
    'click.icptrack.com/icp/',
    'infusionsoft.com/app/emailOpened',
    'via.intercom.io/o',
    'mandrillapp.com/track',
    't.hsms06.com',
    'app.relateiq.com/t.png',
    'go.rjmetrics.com',
    'api.mixpanel.com/track',
    'web.frontapp.com/api',
    'mailtrack.io/trace',
    'sdr.salesloft.com/email_trackers'
  ].map((url) => `img[src*="${url}"]`);

  TRACKERS_SELECTORS.push(...trackingUrls);
  const query = TRACKERS_SELECTORS.join(', ');

  $(query).each((_, el) => {
    $(el).remove();
  });
}

function removeScripts($: CheerioAPI): void {
  $('script').each((_, el) => {
    $(el).remove();
  });
}

function removeComments($: CheerioAPI): void {
  $('*')
    .contents()
    .each((_, el) => {
      if (el.type === 'comment') {
        $(el).remove();
      }
    });
}
