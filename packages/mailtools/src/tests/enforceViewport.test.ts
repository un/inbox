import { load } from 'cheerio';
import enforceViewport from '../enforceViewport';
import { formatHtml } from './utils';

describe('enforceViewport', () => {
  it('should add missing viewport', async () => {
    const email = `
			<html>
				<head></head>
				<div>Hello</div>
			</html>
		`;

    const $ = load(email);
    enforceViewport($);

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<meta
						name="viewport"
						content="width=device-width"
					/>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should add missing head tag', async () => {
    const email = `
			<html>
				<div>Hello</div>
			</html>
		`;

    const $ = load(email);
    enforceViewport($);

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<meta
						name="viewport"
						content="width=device-width"
					/>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should add missing html tag', async () => {
    const email = `
			<div>Hello</div>
		`;

    const $ = load(email);
    enforceViewport($);

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<meta
						name="viewport"
						content="width=device-width"
					/>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should replace existing viewport', async () => {
    const email = `
			<html>
				<head>
					<meta name="viewport" content="width=device-width" />
					<meta name="viewport" content="width=320" />
				</head>
				<body>
				<div>Hello</div>
				</body>
							</html>
		`;

    const $ = load(email);
    enforceViewport($);

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<meta
						name="viewport"
						content="width=device-width"
					/>
				</head>
				<body>
					<div>Hello</div>
				</body>
			</html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should handle invalid HTML', async () => {
    const email = `
		<div>
			<meta name="viewport" content="width=device-width">
			<p>Forwarding you a message</p>
		</div>
		`;

    const $ = load(email);
    enforceViewport($);

    const actual = $.html();

    const expected = `
			<html>
				<head>
					<meta
						name="viewport"
						content="width=device-width"
					/>
				</head>
				<body>
					<div>
						<p>Forwarding you a message</p>
					</div>
				</body>
			</html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });
});
