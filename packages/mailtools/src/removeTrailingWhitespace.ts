import type { CheerioAPI } from 'cheerio';
import {
  getTopLevelElement,
  isRootElement,
  isTextualElement,
  isEmptyLike
} from './cheerio-utils';
import { isComment, isText, type Text, type Element } from 'domhandler';

/**
 * Remove trailing whitespace in given element, using given cheerio context.
 * Returns true if the element was empty and removed completely
 */
function removeTrailingWhitespace(
  $: CheerioAPI,
  el = getTopLevelElement($)
): boolean {
  const hasChildren = el.childNodes && el.childNodes.length > 0;
  const isTextual = isTextualElement(el);

  if (isComment(el)) {
    // Remove it
    $(el).remove();
    return true;
  } else if (isText(el)) {
    if (isEmptyLike(el)) {
      $(el).remove();
      // The element was removed completely
      return true;
    } else {
      const trimmed = (el as Text).data.trimEnd();
      $(el).replaceWith(trimmed);
      // We're done trimming
      return false;
    }
  } else if (!isTextual) {
    // Contains content other than text, we stop trimming here
    return false;
  } else if (hasChildren) {
    // Textual element with children

    // Trim last child
    const wasEmpty = removeTrailingWhitespace($, el.lastChild as Element);
    if (wasEmpty) {
      // Continue trimming this element
      return removeTrailingWhitespace($, el);
    } else {
      // The last element was trimmed as much as possible.
      // We stop here
      return false;
    }
  } else if (isRootElement(el)) {
    // Stop here
    return false;
  } else {
    // Empty textual element, we can remove it.
    $(el).remove();
    return true;
  }
}

export default removeTrailingWhitespace;
