import type { PuppetInstance } from '../index';

export async function setMailServerRoutingHttpEndpoint(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  mailBridgeUrl: string;
}): Promise<{
  orgId: number;
  serverId: string;
  httpEndpointUrl: string;
}> {
  try {
    options.puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/http_endpoints` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForFunction(
      () =>
        document.querySelectorAll(
          'ul[class="endpointList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    /// check and delete the existing records
    const existingRecords = await options.puppetInstance.page.$$(
      'p[class="endpointList__name"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await options.puppetInstance.page
          .locator(`a[class="button button--danger"]`)
          .click();
        await options.puppetInstance.page.waitForNetworkIdle();
      }
    }
    // Create new SMTP Key
    const endpointUrl = `${options.mailBridgeUrl}/postal/mail/inbound/${options.orgId}/${options.serverId}`;
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/http_endpoints/new` as string
    );
    await options.puppetInstance.page
      .locator('input[id="http_endpoint_name"]')
      .fill('uninbox-mail-bridge-http');
    await options.puppetInstance.page
      .locator('input[id="http_endpoint_url"]')
      .fill(endpointUrl);
    await options.puppetInstance.page.select(
      'select[id="http_endpoint_encoding"]',
      'BodyAsJSON'
    );
    await options.puppetInstance.page.select(
      'select[id="http_endpoint_format"]',
      'Hash'
    );
    await options.puppetInstance.page.select(
      'select[id="http_endpoint_strip_replies"]',
      'true'
    );
    await options.puppetInstance.page.select(
      'select[id="http_endpoint_include_attachments"]',
      'true'
    );
    await options.puppetInstance.page
      .locator('input[id="http_endpoint_timeout"]')
      .fill('30');

    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      orgId: options.orgId,
      serverId: options.serverId,
      httpEndpointUrl: endpointUrl
    };
  } catch (error: any) {
    console.log('Postal: setMailServerRoutingHttpEndpoint Error:', error);
    throw new Error(error);
  }
}
