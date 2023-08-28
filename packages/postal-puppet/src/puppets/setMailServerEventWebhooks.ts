import type { PuppetInstance } from '../index';

export async function setMailServerEventWebhooks(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  serverId: string,
  mailBridgeUrl: string
): Promise<{
  data: {
    orgId: string;
    serverId: string;
    webhookUrl: string;
  } | null;
  error: Error | null;
}> {
  try {
    puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/webhooks` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForSelector(
      `a[class="navBar__link is-active"]`
    );

    // check and delete the existing records
    const existingRecords = await puppetInstance.page.$$(
      'li[class="webhookList__link"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await puppetInstance.page
          .locator(
            `a[data-confirm="Are you sure you wish to delete this webhook?"]`
          )
          .click();
        await puppetInstance.page.waitForNetworkIdle();
      }
    }

    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/webhooks/new` as string
    );

    const webhookUrl = `${mailBridgeUrl}/postal/events/${orgId}/${serverId}`;
    await puppetInstance.page
      .locator('input[id="webhook_name"]')
      .fill(serverId);
    await puppetInstance.page
      .locator('input[id="webhook_url"]')
      .fill(webhookUrl);

    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        serverId,
        webhookUrl
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: setMailServerWebhook Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
