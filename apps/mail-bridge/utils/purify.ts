import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export const sanitize = (html: string) =>
  purify.sanitize(html, { USE_PROFILES: { html: true } });
