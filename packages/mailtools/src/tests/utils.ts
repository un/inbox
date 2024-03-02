import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import prettier from 'prettier';

async function formatHtml(html: string) {
  return await prettier.format(html, {
    parser: 'html',
    endOfLine: 'lf',
    printWidth: 150
  });
}

async function compareHTML(actual: string, expected: string) {
  return (await formatHtml(actual)) === (await formatHtml(expected));
}

function readFile(...paths: string[]): string {
  return readFileSync(join(...paths)).toString();
}

function fileExists(...paths: string[]): boolean {
  return existsSync(join(...paths));
}

function readFileIfExists(...paths: string[]): string | null {
  if (!fileExists(...paths)) {
    return null;
  } else {
    return readFile(...paths);
  }
}

export { compareHTML, formatHtml, readFile, fileExists, readFileIfExists };
