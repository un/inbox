import { load } from 'cheerio';
import appendStyle from '../appendStyle';
import { compareHTML } from './utils';

describe('appendStyle', () => {
  it('should add style', async () => {
    const email = `
				<div>Hello</div>
		`;

    const $ = load(email);
    appendStyle(
      $,
      `
				p {
					background: red;
				}

				.title {
					color: black;
				}
			`
    );

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<style>
						p {
							background: red;
						}

						.title {
							color: black;
						}
					</style>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    assert(await compareHTML(actual, expected));
  });

  it('should append style after existing ones', async () => {
    const email = `
			<html>
				<head>
					<style>
						p {
							background: red;
						}
					</style>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    const $ = load(email);
    appendStyle(
      $,
      `
				.title {
					color: black;
				}
			`
    );

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<style>
						p {
							background: red;
						}
					</style>
					<style>
						.title {
							color: black;
						}
					</style>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    assert(await compareHTML(actual, expected));
  });
});
