import type { PuppetInstance } from '../index';

export async function setMailServerApiKey(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
}): Promise<{
  orgId: number;
  serverId: string;
  apiKey: string;
}> {
  try {
    options.puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/credentials` // as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForFunction(
      () =>
        document.querySelectorAll(
          'ul[class="credentialList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    /// check and delete the existing records
    const existingRecords = await options.puppetInstance.page.$$(
      'span[class="label label--credentialType-api"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await options.puppetInstance.page
          .locator(
            `a[data-confirm="Are you sure you wish to delete this credential?"]`
          )
          .click();
        await options.puppetInstance.page.waitForNetworkIdle();
      }
    }
    // Create new Api Key
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/credentials/new` // as string
    );
    await options.puppetInstance.page.select(
      'select[id="credential_type"]',
      'API'
    );
    await options.puppetInstance.page
      .locator('input[id="credential_name"]')
      .fill(`${options.serverId}-api`);
    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    //Extract new api key
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/credentials` // as string
    );
    await options.puppetInstance.page
      .locator('span[class="label label--credentialType-api"]')
      .click();
    const credentialKey = await options.puppetInstance.page
      .locator('input[id="credential_key"]')
      .map((el) => el.value)
      .wait();

    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      orgId: options.orgId,
      serverId: options.serverId,
      apiKey: credentialKey
    };
  } catch (error: any) {
    console.log('Postal: setMailServerWebhook Error:', error);
    throw new Error(error);
  }
}
