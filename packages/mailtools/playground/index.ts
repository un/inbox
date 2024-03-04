import { parseMessage } from '../src';
import type { ParseMessageOptions, ReplacementOptions } from '../src/';

const htmlToParse = `<div dir="ltr">heres a text line<br clear="all"><div><div dir="ltr" class="gmail_signature" data-smartmail="gmail_signature"><div dir="ltr"><div><div dir="ltr"><div><div dir="ltr"><div><div dir="ltr"><div><div style="font-size:12.6667px"><b>Omar McPizza</b></div></div><div style="font-size:12.6667px"><b><br></b></div><div style="font-size:12.6667px"><b>+34 69 420 1337</b></div></div></div></div></div></div></div></div></div></div><br></div><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">On Thu, Feb 29, 2024 at 10:00 PM Omar McPizza &lt;<a href="mailto:omcpizza@example.com">omcpizza@example.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left-width:1px;border-left-style:solid;border-left-color:rgb(204,204,204);padding-left:1ex"><div style="font-family:Arial,sans-serif;font-size:14px">lets see how this all comes out now</div><div style="font-family:Arial,sans-serif;font-size:14px"></div></blockquote></div>`;

const parseOptions: ParseMessageOptions = {
  /** Remove quotations. Only affects the result messageHtml */
  cleanQuotations: false,
  /** Remove and return signatures. Only affects the result messageHtml */
  cleanSignatures: false,
  /** Automatically convert text links to anchor tags */
  autolink: false,
  /** Fix broken links and add the href to the title tag */
  enhanceLinks: false,
  /** Specific viewport to enforce. For example "<meta name="viewport" content="width=device-width">" */
  forceViewport: false,
  /** Replace remote images with a transparent image, and replace other remote URLs with '#' */
  noRemoteContent: false,
  /** Replace remote content with custom URLs */
  remoteContentReplacements: {} as ReplacementOptions,
  /** Append the given style to the HTML <head> */
  includeStyle: false,
  /** Remove specific styles that could affect the rendering of the html */
  cleanStyles: false
};

console.log('Running parseMessage with the following options:');
console.log({ parseOptions });

const parsed = await parseMessage(htmlToParse, parseOptions);
console.log(parsed);
