import type { PuppetInstance } from '../index';

export async function addDomain(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  domainName: string;
}): Promise<{
  orgId: number;
  domainId: string;
  dkimKey: string;
  dkimValue: string;
}> {
  try {
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/domains/new` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.type(
      '[id="domain_name"]',
      options.domainName
    );
    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();
    //extract the domain id from the url using regex
    const pageUrl = options.puppetInstance.page.url();
    const domainId = pageUrl.match(/\/domains\/(.*?)\/setup/)?.[1];

    if (!domainId) throw new Error(`Domain ID not found in URL: ${pageUrl}`);

    // extract the DKIM key and value from the page
    const dkimKey = await options.puppetInstance.page
      .locator('div ::-p-text(domainkey)')
      .map((el) => el.textContent)
      .wait();
    const dkimValue = await options.puppetInstance.page
      .locator('div ::-p-text(DKIM1)')
      .map((el) => el.textContent)
      .wait();
    await options.puppetInstance.page.waitForNetworkIdle();
    return {
      orgId: options.orgId,
      domainId,
      dkimKey,
      dkimValue
    };
  } catch (error: any) {
    console.log('Postal: addDomain Error:', error);
    throw new Error(error);
  }
}
