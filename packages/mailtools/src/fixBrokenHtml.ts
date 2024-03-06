import * as htmlparser2 from 'htmlparser2';

/**
 * Fix various problems in input HTML before it can be parsed by cheerio.
 */
function fixBrokenHtml(inputHtml: string): string {
  const fixedHead = fixBrokenHead(inputHtml);

  return fixedHead;
}

function fixBrokenHead(inputHtml: string): string {
  const encounteredTags = new Set<string>();

  let isBroken = false;

  let headStartIndex: number | undefined;

  const parserDetect = new htmlparser2.Parser({
    onopentag(name) {
      if (name === 'head') {
        headStartIndex = parserDetect.startIndex;
      }

      encounteredTags.add(name);

      const htmlTag = encounteredTags.has('html');
      const headTag = encounteredTags.has('head');
      const blockquoteTag = encounteredTags.has('blockquote');

      // If there's a blockquote before the head tag, this is likely a quoted message
      if (!htmlTag && headTag && !blockquoteTag) {
        isBroken = true;
        parserDetect.reset(); // abort parsing
      } else if (htmlTag) {
        isBroken = false;
        parserDetect.reset(); // abort parsing
      }
    }
  });

  parserDetect.write(inputHtml);
  parserDetect.end();

  if (!isBroken) {
    return inputHtml;
  }

  // Remove everything before head, and wrap in html
  let fixedHtml = inputHtml.slice(headStartIndex);
  fixedHtml = `<html>${fixedHtml}</html>`;
  return fixedHtml;
}

export default fixBrokenHtml;
