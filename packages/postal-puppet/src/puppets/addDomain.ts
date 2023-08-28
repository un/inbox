import type { PuppetInstance } from '../index';

export async function addDomain(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  domainName: string
): Promise<{
  data: {
    orgId: string;
    domainId: string;
    dkimKey: string;
    dkimValue: string;
  } | null;
  error: Error | null;
}> {
  try {
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/domains/new` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.type('[id="domain_name"]', domainName);
    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();
    //extract the domain id from the url using regex
    const pageUrl = puppetInstance.page.url();
    const domainId = pageUrl.match(/\/domains\/(.*?)\/setup/)?.[1];

    if (!domainId) throw new Error(`Domain ID not found in URL: ${pageUrl}`);

    // extract the DKIM key and value from the page
    const dkimKey = await puppetInstance.page
      .locator('div ::-p-text(domainkey)')
      .map((el) => el.textContent)
      .wait();
    const dkimValue = await puppetInstance.page
      .locator('div ::-p-text(DKIM1)')
      .map((el) => el.textContent)
      .wait();
    await puppetInstance.page.waitForNetworkIdle();
    return {
      data: {
        orgId,
        domainId,
        dkimKey,
        dkimValue
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: addDomain Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
