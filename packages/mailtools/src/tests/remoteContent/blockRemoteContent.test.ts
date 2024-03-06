import { compareHTML, formatHtml, readFile } from '../utils';
import { blockRemoteContent } from '../../blockRemoteContent';

const EMAIL_PRIVACY_TESTER = readFile(
  import.meta.dirname,
  'email-privacy-tester.html'
);

describe('remote-content', () => {
  it('should replace remote content URLs in all style declarations', async () => {
    const input = `
			<html>
				<head>
					<style>
						@import url('https://remote.com/style.css');

						p {
							background-image: url(https://remote.com/image.png);
						}
					</style>
				</head>
				<body>
					<p
						style="background: url(http://remote.com/asdf/foo/bar.jpg)"
					>
						Hello
					</p>
					<style>
						@import url('https://remote.com/style.css');

						p {
							background-image: url('foo/bar.jpg');
							background-image: url(data:image/gif;base64,ABCDEFGH=);
							background-image: url('data:image/gif;base64,ABCDEFGH=');
							background-image: url('cid:ii_k5cmfars0');
							background-image: url(http://remote.com/asdf/foo/bar.jpg);
							background-image: url('https://remote.com/asdf/foo/bar.jpg');
							background-image: url('http://remote.com/asdf/foo/bar.jpg');
						}
					</style>
				</body>
			</html>
		`;

    const expected = `
			<html>
				<head>
					<style>
						@import url('REPLACED_IMAGE');

						p {
							background-image: url(REPLACED_IMAGE);
						}
					</style>
				</head>
				<body>
					<p
						style="background: url(REPLACED_IMAGE)"
					>
						Hello
					</p>
					<style>
						@import url('REPLACED_IMAGE');

						p {
							background-image: url('foo/bar.jpg');
							background-image: url(data:image/gif;base64,ABCDEFGH=);
							background-image: url('data:image/gif;base64,ABCDEFGH=');
							background-image: url('cid:ii_k5cmfars0');
							background-image: url(REPLACED_IMAGE);
							background-image: url('REPLACED_IMAGE');
							background-image: url('REPLACED_IMAGE');
						}
					</style>
				</body>
			</html>
		`;

    const actual = blockRemoteContent(input, { image: 'REPLACED_IMAGE' });

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should not replace embedded image (data:)', async () => {
    const input = `
			<html>
				<head></head>
				<body>
					<div>
						<img
							alt="attached-image.jpg"
							apple-inline="yes"
							id="2F2AD029-71DC-47C2-B217-0DD1152403C3"
							src="data:image/png;base64,ADSADSAD"
						/><br /><br />Cheers!<br />Jonathan
					</div>
				</body>
			</html>
		`;

    const expected = input;

    const actual = blockRemoteContent(input, { image: 'REPLACED_IMAGE' });

    assert(await compareHTML(actual, expected));
  });
  it('should not replace image attachment (cid:) URLs', async () => {
    const input = `
			<html>
				<head></head>
				<body>
					<div>
						<img
							alt="attached-image.jpg"
							apple-inline="yes"
							id="2F2AD029-71DC-47C2-B217-0DD1152403C3"
							src="cid:ii_k5cmfars0"
						/><br /><br />Cheers!<br />Jonathan
					</div>
				</body>
			</html>
		`;

    const expected = input;

    const actual = blockRemoteContent(input, { image: 'REPLACED_IMAGE' });

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));
  });

  it('should replace remote content URLs in the email privacy tester', async () => {
    const input = EMAIL_PRIVACY_TESTER;
    // console.log(input);
    const actual = blockRemoteContent(input, {
      image: 'REPLACED_IMAGE',
      other: 'REPLACED_URL'
    });
    // console.log(actual);

    const expected = `
    <html lang="en-GB" manifest="REPLACED_URL">
    	<head>
				<meta name="author" content="Mike Cardwell. <https://grepular.com/>" />
				<meta name="copyright" content="Copyright ©2016 Mike Cardwell. All rights reserved." />
				<meta name="description" content="Email Privacy Tester" />
    		<title>Email Privacy Tester</title>
    		<link rel="alternate" type="application/rss+xml" href="REPLACED_URL">
    		<link rel="alternate" type="application/atom+xml" href="REPLACED_URL">
    		<script type="text/javascript" src="REPLACED_IMAGE"></script>
    		<link rel="stylesheet" type="text/css" href="REPLACED_URL">
    		<link rel="stylesheet" type="text/css" href="cid:5e175f8d8af4d70022fc5832.css@www.emailprivacytester.com">
    		<link rel="search" type="application/opensearchdescription+xml" href="REPLACED_URL">
    	</head>
    	<body>
    		<p style="border-bottom:1px solid #000;padding-bottom:1em;">
    			<span style="font-size:1.4em;border-bottom:1px solid #333;">Email Privacy Tester</span><br><br>This is
    			your test email from the Email Privacy Tester. Please ignore everything after this line. Clicking on
    			anything will skew the results.
    		</p>
    		<p style="background-image:url(&apos;REPLACED_IMAGE&apos;);"></p>
    		<p style="content:url(&apos;REPLACED_IMAGE&apos;);"></p>
    		<p style="behavior:url(&apos;REPLACED_IMAGE&apos;) url(&apos;REPLACED_IMAGE&apos;);"></p>
    		<style type="text/css"></style><style type="text/css"></style>
    		<div id="cssEscape"></div>
    		<style type="text/css"></style><object type="image/svg+xml" data="cid:5e175f8d8af4d70022fc5832.svg@www.emailprivacytester.com"><embed type="image/svg+xml" src="cid:5e175f8d8af4d70022fc5832.svg@www.emailprivacytester.com"></object><iframe src="cid:5e175f8d8af4d70022fc5832.svg@www.emailprivacytester.com" width="1" height="1"></iframe><span></span><img width="16" height="16" src="REPLACED_IMAGE"><img src="REPLACED_IMAGE" width="16" height="16"><input type="image" src="REPLACED_IMAGE"><a href="http://5e175f8d8af4d70022fc5832.anchor-test.ept.emailprivacytester.com"></a><link rel="dns-prefetch" href="REPLACED_URL"><link rel="prefetch" href="REPLACED_URL"><video src="REPLACED_IMAGE" width="1" height="1"></video><video poster="REPLACED_IMAGE" width="1" height="1">
    			<source src="REPLACED_IMAGE" type="video/mp4; codecs=&quot;avc1.4D401E, mp4a.40.2&quot;">
    			<source src="REPLACED_IMAGE" type="video/webm; codecs=&quot;vp8.0, vorbis&quot;">
    			<source src="REPLACED_IMAGE" type="video/ogg; codecs=&quot;theora, vorbis&quot;"></video><audio src="REPLACED_IMAGE" preload="metadata" width="1" height="1"></audio><span></span><object width="16" height="16" data="REPLACED_URL" type="image/png"></object><iframe src="REPLACED_IMAGE" width="1" height="1"></iframe><span></span>
    		<p style="background-color:expression((document.createElement(&apos;img&apos;))[&apos;src&apos;]=https://api.emailprivacytester.com/callback?code=5e175f8d8af4d70022fc5832&amp;test=cssExpression);"></p>
    		<object width="1" height="1"><param name="movie" value="flash.swf"><embed src="REPLACED_IMAGE" width="1" height="1"></object><iframe width="1" height="1" src="REPLACED_IMAGE"></iframe><iframe width="1" height="1" src="REPLACED_IMAGE"></iframe><iframe width="1" height="1" src="REPLACED_IMAGE"></iframe><span></span>
    	</body>
    </html>
		`;

    expect(await formatHtml(actual)).toBe(await formatHtml(expected));

    const containsApiCalls = /;test=(?!cssExpression)/g.test(actual);
    expect(containsApiCalls).toBe(false);
  });
});
