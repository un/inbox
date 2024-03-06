import type { CheerioAPI } from 'cheerio';

/**
 * Add CSS style to the page
 */
function appendStyle(
  $: CheerioAPI,
  // Example: `.title { color: red; }`
  css: string
) {
  const styleElement = $(`<style>${css}</style>`);
  const head = $('head'); // Cheerio already makes sure head is present
  head.append(styleElement);
}

export default appendStyle;
