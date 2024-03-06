import { load } from 'cheerio';
import walkBackwards from '../walkBackwards';
import { getTopLevelElement } from '../cheerio-utils';
import type { AnyNode } from 'domhandler';

export function printEl(el: AnyNode): string {
  if (el.type === 'text') {
    return el.data.trim();
  } else {
    return (el as any).tagName;
  }
}

describe('walkBackwards', () => {
  it('should walk depth-first, in reverse order', () => {
    const $ = load(`
			<html>
				<head></head>
				<body>
					<k>
						text-j
						<i>
							text-h
							<g>
								text-f
							</g>
							text-e
							<d>
								text-c
							</d>
							text-b
						</i>
						text-a
					</k>
				</body>
			</html>
		`);

    const order = [];
    for (const el of walkBackwards(getTopLevelElement($))) {
      order.push(printEl(el));
    }

    expect(order).toEqual([
      '',
      'text-a',
      'text-b',
      'text-c',
      'd',
      'text-e',
      'text-f',
      'g',
      'text-h',
      'i',
      'text-j',
      'k',
      '',
      'body'
    ]);
  });

  it('should be breakable', () => {
    const $ = load(`
			<k>
				text-j
				<i>
					text-h
					<g>
						text-f
					</g>
					text-e
					<d>
						text-c
					</d>
					text-b
				</i>
				text-a
			</k>
		`);

    const order = [];
    for (const el of walkBackwards(getTopLevelElement($))) {
      if (printEl(el) === 'text-a') {
        continue;
      }

      order.push(printEl(el));

      if (printEl(el) === 'text-e') {
        break;
      }
    }

    expect(order).toEqual([
      '',
      // 'text-a',
      'text-b',
      'text-c',
      'd',
      'text-e'
      // 'text-f',
      // 'g',
      // 'text-h',
      // 'i',
      // 'text-j',
      // 'k',
      // '',
      // 'root',
    ]);
  });
});
