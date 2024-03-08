import linkify from '../linkify';

describe('linkify', () => {
  it('should linkify URL in paragraph', () => {
    const email = `<p>
			Quis est tam dissimile
			homini. Claudii libidini, qui tum erat summo ne imperio, dederetur.
			loripsum.net
		</p>`;

    expect(linkify(email)).toBe(`<p>
			Quis est tam dissimile
			homini. Claudii libidini, qui tum erat summo ne imperio, dederetur.
			<a href="http://loripsum.net" target="_blank" rel="noopener noreferrer">loripsum.net</a>
		</p>`);
  });

  it('should not linkify URLs in anchor tags', () => {
    const email = `<p>
			Quis est tam dissimile
			homini. Claudii libidini, qui tum erat summo ne imperio, dederetur.
			<a href="http://loripsum.net" target="_blank" rel="noopener noreferrer">loripsum.net</a>
		</p>`;

    expect(linkify(email)).toBe(email);
  });

  it('should linkify other kinds of URLs', () => {
    const email = `<p>
			hello@email.com
			yourtempo.co
			http://yourtempo.co
			https://yourtempo.co
			ftp://yourtempo.co
			+33578758785
		</p>`;

    expect(linkify(email)).toBe(`<p>
			<a href="mailto:hello@email.com" target="_blank" rel="noopener noreferrer">hello@email.com</a>
			<a href="http://yourtempo.co" target="_blank" rel="noopener noreferrer">yourtempo.co</a>
			<a href="http://yourtempo.co" target="_blank" rel="noopener noreferrer">http://yourtempo.co</a>
			<a href="https://yourtempo.co" target="_blank" rel="noopener noreferrer">https://yourtempo.co</a>
			<a href="ftp://yourtempo.co" target="_blank" rel="noopener noreferrer">ftp://yourtempo.co</a>
			<a href="tel:+33578758785" target="_blank" rel="noopener noreferrer">+33578758785</a>
		</p>`);
  });

  it('should ignore script tags, style tags, and head', () => {
    const email = `
		<html>
			<head>
				<meta charset="utf-8">
				<title>Not a link.com</title>
				<style type="text/css">
					p {
						content: 'Not a link.com ';
					}
				</style>
			</head>
			<body>
				Hello
				<style type="text/css">
					p {
						content: 'Not a link.com ';
					}
				</style>
				<script>
					console.log('This is not a link.com ');
				</script>
			</body>
		</html>
		`;

    expect(linkify(email)).toBe(email);
  });

  it('should work fine with DOCTYPE', () => {
    const email = `
		<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
		<html>
		  <!-- No problem -->
			<head>
				<meta charset="utf-8">
				<title>Not a link.com</title>
				<style type="text/css">
					p {
						content: 'Not a link.com ';
					}
				</style>
			</head>
			<body>
				Hello
				<style type="text/css">
					p {
						content: 'Not a link.com ';
					}
				</style>
				<script>
					console.log('This is not a link.com ');
				</script>
			</body>
		</html>
		`;

    expect(linkify(email)).toBe(email);
  });
});
