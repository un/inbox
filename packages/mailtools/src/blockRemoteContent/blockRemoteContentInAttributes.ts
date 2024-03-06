import type { Cheerio, CheerioAPI } from 'cheerio';
import { isTag, type AnyNode } from 'domhandler';
import { type ReplacementOptions } from './';

// https://stackoverflow.com/questions/2725156/complete-list-of-html-tag-attributes-which-have-a-url-value
const TAGS_THAT_HAVE_URL_ATTRIBUTES: { [key: string]: string[] } = {
  // Keep this one, since it won't be fetched unless clicked.
  // a: ['href'],
  applet: ['codebase'],
  area: ['href'],
  audio: ['src'],
  base: ['href'],
  blockquote: ['cite'],
  body: ['background'],
  button: ['formaction'],
  command: ['icon'],
  del: ['cite'],
  embed: ['src'],
  form: ['action'],
  frame: ['longdesc', 'src'],
  head: ['profile'],
  html: ['manifest'],
  iframe: ['longdesc', 'src'],
  img: ['longdesc', 'src', 'usemap'],
  input: ['src', 'usemap', 'formaction'],
  ins: ['cite'],
  link: ['href'],
  meta: ['content'],
  object: ['classid', 'codebase', 'data', 'usemap'],
  q: ['cite'],
  script: ['src'],
  source: ['src'],
  track: ['src'],
  video: ['poster', 'src']
};

/**
 * Replace all remote URLs in tags' attributes
 */
function blockRemoteContentInAttributes(
  $: CheerioAPI,
  replacements: Required<ReplacementOptions>
) {
  const query = Object.keys(TAGS_THAT_HAVE_URL_ATTRIBUTES).join(',');

  $(query).each((_, el) => {
    const $el = $(el);
    if (!isTag(el)) return;

    if (el.tagName === 'meta') {
      if (isMetaRefresh($el)) {
        $el.remove();
      }
      return;
    }

    getUrlAttributes(el.tagName, $el)
      .filter((attr) => {
        const value = $el.attr(attr);
        return !value || isRemoteUrl(value);
      })
      .forEach((attr) => {
        const replacement = isImageAttribute(attr)
          ? replacements.image
          : replacements.other;
        $el.attr(attr, replacement);
      });
  });
}

function isMetaRefresh(meta: Cheerio<AnyNode>): boolean {
  // https://www.emailprivacytester.com/testDescription?test=metaRefresh
  const httpEquiv = meta.attr('http-equiv') || '';
  const content = meta.attr('content') || '';
  return /^refresh$/i.test(httpEquiv) || /^\d*;\s*URL=/.test(content);
}

/**
 * Returns the list of URL attributes declared on this element
 */
function getUrlAttributes(
  tagName: string,
  // Cheerio scoped on the element
  $el: Cheerio<AnyNode>
): string[] {
  const attrs = $el.attr();
  const potentialAttributes: string[] =
    TAGS_THAT_HAVE_URL_ATTRIBUTES[tagName] || [];

  return potentialAttributes.filter(
    Object.prototype.hasOwnProperty.bind(attrs)
  );
}

const IMAGE_ATTRIBUTES = new Set([
  'background',
  'icon',
  'placeholder',
  'poster',
  'src',
  'srcset'
]);

function isImageAttribute(attr: string): boolean {
  return IMAGE_ATTRIBUTES.has(attr);
}

function isRemoteUrl(attributeValue: string) {
  // There can be several URLs. We consider them remote then.
  // (for example img srcset: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-srcset)
  const isLocal = /^(?:data:|cid:)\S*$/.test(attributeValue);
  return !isLocal;
}

export default blockRemoteContentInAttributes;
