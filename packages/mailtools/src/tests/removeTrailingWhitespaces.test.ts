import { load } from 'cheerio';
import removeTrailingWhitespace from '../removeTrailingWhitespace';
import { compareHTML } from './utils';
import { getTopLevelElement } from '../cheerio-utils';

describe('removeTrailingWhitespaces', () => {
  it('should trim an empty body', () => {
    check(
      `
    		<html><body></body></html>
				`,
      `
    		<html><head></head><body></body></html>
  	  `
    );
  });

  it('should trim an empty div', () => {
    check(
      `
    		<div></div>
			`,
      `<html><head></head><body></body></html>`
    );
  });

  it('should trim text', () => {
    check(
      `
				<html><head></head><body><div>Hello    </div></body></html>
			`,
      `
				<html><head></head><body><div>Hello</div></body></html>
    	`
    );
  });

  it('should trim br, and hr', () => {
    check(
      `
				<html><head></head><body><div>Hello<br/>  <hr/> <br/></div></body></html>
			`,
      `
				<html><head></head><body><div>Hello</div></body></html>
    	`
    );
  });

  it('should trim inside a body', () => {
    check(
      `
				<html><head><meta charset="utf-8"></head><body><div>Hello<br/>  <hr/> <br/></div></body></html>
			`,
      `
			  <html><head><meta charset="utf-8"></head><body><div>Hello</div></body></html>
	`
    );
  });

  it('should not change trimmed content', () => {
    check(
      `
				<html><head></head><body><div>Hello</div></body></html>
			`,
      `
				<html><head></head><body><div>Hello</div></body></html>
    	`
    );
  });

  it('should not trim left side of last text', () => {
    check(
      `
			<html><head></head><body><p>--<br />I use <a href="https://www.yourtempo.co">Tempo</a> to improve my focus</p></body></html>
			
			`,
      `
			<html><head></head><body><p>--<br />I use <a href="https://www.yourtempo.co">Tempo</a> to improve my focus</p></body></html>
			`
    );
  });

  it('should not trim pre', () => {
    check(
      `
				<html><head></head><body><div>Hello <pre>Hi, this is code  </pre></div></body></html>
			`,
      `
				<html><head></head><body><div>Hello <pre>Hi, this is code  </pre></div></body></html>
    	`
    );
  });

  it('should stop trimming at img', () => {
    check(
      `
				<html><head></head><body><div>Hello <img src="src">  <br/></div></body></html>
			`,
      `
				<html><head></head><body><div>Hello <img src="src"></div></body></html>
    	`
    );
  });

  it('should trim recursively up the HTML tree', () => {
    check(
      `
				<html><head></head><body><div><div>Hello <hr> </div> <br/></div></body></html>
			`,
      `
				<html><head></head><body><div><div>Hello</div></div></body></html>
    	`
    );
  });

  it('should trim remnants of signature', () => {
    check(
      `
				<html><head></head><body><div><div>Hello </div><br clear="all"><br>-- <br></div></body></html>
			`,
      `
				<html><head></head><body><div><div>Hello</div></div></body></html>
    	`
    );
  });

  it('should trim comments', () => {
    check(
      `
				<html>
					<head></head>
					<body>
						<div>
							<div>Hello</div>
							<p>
								<!-- Some extra spaces -->
								<br />
							</p>
						</div>
					</body>
				</html>
			`,
      `
				<html>
					<head></head>
					<body>
						<div>
							<div>Hello</div>
						</div>
					</body>
				</html>
			`
    );
  });

  it('should not trim images', () => {
    check(
      `
				<html>
					<head>
						<meta
							http-equiv="Content-Type"
							content="text/html; charset=us-ascii"
						/>
					</head>
					<body
						style="word-wrap: break-word; -webkit-nbsp-mode: space; line-break: after-white-space;"
					>
						<div dir="ltr">
							<p>
								Hello
							</p>
							<div>
								<img
									alt="attached-image.jpg"
									apple-inline="yes"
									id="2F2AD029-71DC-47C2-B217-0DD1152403C3"
									src="cid:ii_k5cmfars0"
								/><br /><br />Cheers!<br />Jonathan
							</div>
						</div>
					</body>
				</html>
			`,
      `
				<html>
					<head>
						<meta
							http-equiv="Content-Type"
							content="text/html; charset=us-ascii"
						/>
					</head>
					<body
						style="word-wrap: break-word; -webkit-nbsp-mode: space; line-break: after-white-space;"
					>
						<div dir="ltr">
							<p>
								Hello
							</p>
							<div>
								<img
									alt="attached-image.jpg"
									apple-inline="yes"
									id="2F2AD029-71DC-47C2-B217-0DD1152403C3"
									src="cid:ii_k5cmfars0"
								/><br /><br />Cheers!<br />Jonathan
							</div>
						</div>
					</body>
				</html>
			`
    );
  });
});

async function check(before: string, after: string): Promise<void> {
  const $ = load(before);
  removeTrailingWhitespace($);

  const result = $.html();
  assert(await compareHTML(result, after));

  // Check that it did not create text nodes as parent of themselves
  // which messes up the next steps
  const top = getTopLevelElement($);
  function checkForNoCircularTextReference(parent: any) {
    if (parent.type === 'text') {
      //@ts-expect-error, Figure out types if needed
      parent.children?.forEach((child) => {
        expect(child.type).not.toEqual('text');
      });
    } else {
      parent.children?.forEach(checkForNoCircularTextReference);
    }
  }
  checkForNoCircularTextReference(top);
}
