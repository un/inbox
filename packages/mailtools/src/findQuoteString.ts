import { isDocument, isEmpty, getTopLevelElement } from './cheerio-utils';
import { isText, type Node } from 'domhandler';
import walkBackwards from './walkBackwards';
import type { CheerioAPI } from 'cheerio';
import { decode } from 'html-entities';

// https://github.com/quentez/talonjs/blob/26de2941d9ea739e12853534717a820c72a6f8e9/src/Regexp.ts#L9:L9
const ON_REGEXP = new RegExp(
  `^\\s*(${
    // Beginning of the line.
    [
      'On', // English,
      'Le', // French
      'W dniu', // Polish
      'Op', // Dutch
      'Am', // German
      'På', // Norwegian
      'Den', // Swedish, Danish,
      'Em', // Portuguese
      'El' // Spanish
    ].join('|')
  })\\s`,
  'i'
);

const WROTE_REGEXP = new RegExp(
  `\\s(${
    // Ending of the line.
    [
      'wrote',
      'sent', // English
      'a écrit', // French
      'napisał', // Polish
      'schreef',
      'verzond',
      'geschreven', // Dutch
      'schrieb', // German
      'skrev', // Norwegian, Swedish
      'escreveu', // Portuguese
      'escribió' // Spanish
    ].join('|')
  })\\s?:?\\s*$`,
  'i'
);

function isQuoteHeaderStart(el: Node): boolean {
  return isText(el) && ON_REGEXP.test(decode(el.data));
}

function isQuoteHeaderEnd(el: Node): boolean {
  return isText(el) && WROTE_REGEXP.test(decode(el.data));
}

/**
 * Loop through doc DOM-element starting from the bottom and search for a string like:
 * "On Friday, 27 November 2015, Your Tempo <contact@yourtempo.co> wrote:"
 * These nodes are returned to be deleted.
 */
function findQuoteString($: CheerioAPI): Node[] {
  const nodesToRemove: Node[] = [];

  // If we have seen a "... wrote:" yet
  let seenQuoteHeaderEnd = false;

  const top = getTopLevelElement($);

  // loop through childNodes backwards
  for (const el of walkBackwards(top)) {
    if (isDocument(el)) {
      continue;
    }

    if (isText(el)) {
      if (isEmpty(el)) {
        // Ignore empty texts
        continue;
      }
      // console.log(el.data);
      if (!seenQuoteHeaderEnd) {
        if (isQuoteHeaderEnd(el)) {
          seenQuoteHeaderEnd = true;
          nodesToRemove.push(el);

          // Check if On... + wrote... are in the same node...
          if (isQuoteHeaderStart(el)) {
            // We're done. Stop iterating
            break;
          } else {
            continue;
          }
        } else {
          // We have reached content. Stop iterating
          break;
        }
      } else {
        // We are inside the quote header. So we remove everything
        nodesToRemove.push(el);
        // Until we reach the start of the header
        if (isQuoteHeaderStart(el)) {
          // This node is also the start of the header. We're done
          break;
        } else {
          continue;
        }
      }
    } else {
      // It's not a text
      if (seenQuoteHeaderEnd) {
        // It's inside the quote
        nodesToRemove.push(el);
      }
      continue;
    }
  }

  return nodesToRemove;
}

export default findQuoteString;
