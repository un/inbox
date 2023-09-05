import type { PuppetInstance } from '../index';

export async function setMailServerEventWebhooks(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  mailBridgeUrl: string;
}): Promise<{
  data: {
    orgId: number;
    serverId: string;
    webhookUrl: string;
  } | null;
  error: Error | null;
}> {
  try {
    options.puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/webhooks` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForSelector(
      `a[class="navBar__link is-active"]`
    );

    // check and delete the existing records
    const existingRecords = await options.puppetInstance.page.$$(
      'li[class="webhookList__link"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await options.puppetInstance.page
          .locator(
            `a[data-confirm="Are you sure you wish to delete this webhook?"]`
          )
          .click();
        await options.puppetInstance.page.waitForNetworkIdle();
      }
    }

    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/webhooks/new` as string
    );

    const webhookUrl = `${options.mailBridgeUrl}/postal/events/${options.orgId}/${options.serverId}`;
    await options.puppetInstance.page
      .locator('input[id="webhook_name"]')
      .fill(options.serverId);
    await options.puppetInstance.page
      .locator('input[id="webhook_url"]')
      .fill(webhookUrl);

    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId: options.orgId,
        serverId: options.serverId,
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
