import type { CheerioAPI } from 'cheerio';
import { validate as isValidEmail } from 'email-validator';
import isValidDomain from 'is-valid-domain';

export const hasProtocol = (link: string) => {
  const lowerCaseLink = link.toLowerCase();
  return Boolean(lowerCaseLink.match(/^[a-z][a-z0-9+-.]*:/i));
};

/**
 * Scans the document for links that don't start
 * with a protocol and adds one automatically.
 */
const addHttpsToRelativeLinks = ($: CheerioAPI) => {
  $('a').each((_, link) => {
    const href = link.attribs.href;

    if (href && !hasProtocol(href)) {
      if (isValidDomain(href.split('/')[0] || '')) {
        // Valid domains are prepended with https://
        link.attribs.href = `https://${href}`;
      } else if (isValidEmail(href)) {
        // Valid email addresses get an extra mailto:
        link.attribs.href = `mailto:${href}`;
      }
    }
  });
};

const addTitlesToLinks = ($: CheerioAPI) => {
  $('a').each((_, link) => {
    if (link.attribs.title) {
      link.attribs.title += ` (${link.attribs.href})`;
    } else {
      link.attribs.title = link.attribs.href || '';
    }
  });
};

export const enhanceLinks = ($: CheerioAPI) => {
  addHttpsToRelativeLinks($);
  addTitlesToLinks($);
};
