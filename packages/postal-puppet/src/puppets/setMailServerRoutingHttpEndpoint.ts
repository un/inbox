import type { PuppetInstance } from '../index';

export async function setMailServerRoutingHttpEndpoint(
  puppetInstance: PuppetInstance,
  orgId: number,
  orgPublicId: string,
  serverId: string,
  mailBridgeUrl: string
): Promise<{
  data: {
    orgId: number;
    serverId: string;
    httpEndpointUrl: string;
  } | null;
  error: Error | null;
}> {
  try {
    puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/http_endpoints` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="endpointList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    /// check and delete the existing records
    const existingRecords = await puppetInstance.page.$$(
      'p[class="endpointList__name"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await puppetInstance.page
          .locator(`a[class="button button--danger"]`)
          .click();
        await puppetInstance.page.waitForNetworkIdle();
      }
    }
    // Create new SMTP Key
    const endpointUrl = `${mailBridgeUrl}/postal/mail/inbound/${orgId}/${serverId}`;
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/http_endpoints/new` as string
    );
    await puppetInstance.page
      .locator('input[id="http_endpoint_name"]')
      .fill('uninbox-mail-bridge-http');
    await puppetInstance.page
      .locator('input[id="http_endpoint_url"]')
      .fill(endpointUrl);
    await puppetInstance.page.select(
      'select[id="http_endpoint_encoding"]',
      'BodyAsJSON'
    );
    await puppetInstance.page.select(
      'select[id="http_endpoint_format"]',
      'Hash'
    );
    await puppetInstance.page.select(
      'select[id="http_endpoint_strip_replies"]',
      'true'
    );
    await puppetInstance.page.select(
      'select[id="http_endpoint_include_attachments"]',
      'true'
    );
    await puppetInstance.page
      .locator('input[id="http_endpoint_timeout"]')
      .fill('30');

    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        serverId,
        httpEndpointUrl: endpointUrl
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: setMailServerRoutingHttpEndpoint Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
