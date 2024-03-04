import { isImage, toArray, isEmptyLike } from './cheerio-utils';
import { isText } from 'domhandler';
import findQuoteString from './findQuoteString';
import type { CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

/**
 * Remove quotations (replied messages) and signatures from the HTML
 */
function removeQuotations($: CheerioAPI): { didFindQuotation: boolean } {
  let didFindQuotation = false;

  // Remove blockquote elements
  const quoteElements = findAllQuotes($);

  didFindQuotation = didFindQuotation || quoteElements.length > 0;
  quoteElements.each((_, el) => void $(el).remove());

  // When all blockquotes are removed, remove any remaining quote header text
  const remainingQuoteNodes = findQuoteString($) as AnyNode[];
  didFindQuotation = didFindQuotation || remainingQuoteNodes.length > 0;
  remainingQuoteNodes.forEach((el) => $(el).remove());

  return { didFindQuotation };
}

/**
 * Returns a selection of all quote elements that should be removed
 */
function findAllQuotes($: CheerioAPI) {
  const quoteElements = $(
    [
      '.gmail_quote',
      'blockquote',
      '[class*="quote"]', // quote partial match for class names
      '[id*="quote"]' // quote partial match for id names
      // ENHANCEMENT: Add findQuotesAfterMessageHeaderBlock
      // ENHANCEMENT: Add findQuotesAfter__OriginalMessage__
    ].join(', ')
  );
  // console.log(quoteElements.html());
  // Ignore inline quotes. Quotes that are followed by non-quote blocks.
  const quoteElementsSet = new Set(toArray(quoteElements));
  const withoutInlineQuotes = quoteElements.filter(
    (i, el) => !isInlineQuote(el as Element, quoteElementsSet as Set<Element>)
  );

  return withoutInlineQuotes;
}

/**
 * Returns true if the element looks like an inline quote:
 * it is followed by unquoted elements
 *
 * Works best if non-meaningful content were stripped before, like tracking pixels.
 *
 * Based on
 * https://github.com/Foundry376/Mailspring/blob/aa125f0136c093e0aa3deb7c46bb6433f6ede6b9/app/src/services/quoted-html-transformer.ts#L228:L228
 */
function isInlineQuote(el: Element, quoteSet: Set<Element>): boolean {
  const seen = new Set();
  let head = el;

  while (head) {
    // advance to the next sibling, or the parent's next sibling
    while (head && !head.nextSibling) {
      head = head.parentNode as Element;
    }
    if (!head) {
      break;
    }
    head = head.nextSibling as Element;

    // search this branch of the tree for any text nodes / images that
    // are not contained within a matched quoted text block. We mark
    // the subtree as "seen" because we traverse upwards, and would
    // re-evaluate the subtree on each iteration otherwise.
    const pile = [head];
    let node = null;

    while ((node = pile.pop())) {
      if (seen.has(node)) {
        continue;
      }
      if (quoteSet.has(node)) {
        continue;
      }
      if (node.childNodes) {
        pile.push(...(node.childNodes as Element[]));
      }
      if (isImage(node)) {
        return true;
      }
      if (isText(node) && !isEmptyLike(node)) {
        return true;
      }
    }
    seen.add(head);
  }

  return false;
}

export default removeQuotations;
