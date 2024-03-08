import type { AnyNode, Cheerio, CheerioAPI } from 'cheerio';
import { isText, type Node, type Element } from 'domhandler';

const TEXTUAL = new Set([
  'root',
  'body',

  // Text content
  'p',
  'div',

  // Separators
  'hr',
  'br',

  // Inline text
  'span',
  'b',
  'a',
  'em',
  'i',
  's',
  'strong'
]);

function isTextualElement(el: Element): boolean {
  return TEXTUAL.has(el.tagName);
}

function isDocument(el: Element): boolean {
  return el.tagName === 'html';
}

function isBody(el: Element): boolean {
  return el.tagName === 'body';
}

function isImage(el: Element): boolean {
  return el.tagName === 'img';
}

function isRootElement(el: Element): boolean {
  return isBody(el) || isDocument(el) || el.tagName === 'root';
}

function hasChildren(el: Element): boolean {
  return el.children && el.children.length > 0;
}

const EMPTY_REGEX = /^\s*$/;
function isEmpty(text: Node): boolean {
  if (isText(text)) {
    return EMPTY_REGEX.test(text.data || '');
  } else {
    return false;
  }
}

// Also consider signatures and disclaimer remnants like '---' as empty
const EMPTY_LIKE_REGEX = /^\s*-*\s*$/;
function isEmptyLike(text: Node): boolean {
  if (isText(text)) {
    return EMPTY_LIKE_REGEX.test(text.data || '');
  } else {
    return false;
  }
}

/**
 * True if the element and its children only contains empty texts
 */
function containsEmptyText(el: Element): boolean {
  if (isText(el)) {
    return isEmpty(el);
  } else if (hasChildren(el)) {
    return el.children.every((el) => containsEmptyText(el as Element));
  } else {
    return true;
  }
}

function getTopLevelElement($: CheerioAPI): Element {
  const body = $('body');
  return body.length > 0 ? body.get(0)! : $.root().children().get(0)!;
}

/**
 * Convert a Cheerio selection to an array of CheerioElement
 */
function toArray<T extends AnyNode>(selection: Cheerio<T>): T[] {
  const res: T[] = [];
  selection.each((i, el) => void res.push(el));
  return res;
}

export {
  getTopLevelElement,
  isBody,
  isDocument,
  isImage,
  isRootElement,
  isTextualElement,
  isEmpty,
  isEmptyLike,
  containsEmptyText,
  hasChildren,
  toArray
};
