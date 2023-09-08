import type { PuppetInstance } from '../index';

export async function setMailServerConfig(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  sendLimit?: number;
  outboundSpamThreshold?: number;
  messageRetentionDays?: number;
  rawMessageRetentionDays?: number;
  rawMessageRetentionSize?: number;
}): Promise<{
  orgId: number;
  serverId: string;
  sendLimit: number;
  outboundSpamThreshold: number;
  messageRetentionDays: number;
  rawMessageRetentionDays: number;
  rawMessageRetentionSize: number;
}> {
  async function setAndGetLimits(
    selector: string,
    newLimit: number | undefined
  ): Promise<number> {
    // await puppetInstance.page.select(selector, 'custom');
    const inputElement = await options.puppetInstance.page.locator(selector);
    newLimit && (await inputElement.fill(newLimit.toString()));
    //@ts-ignore
    const finalValue = +(await inputElement.map((el) => el.value).wait());
    return finalValue;
  }
  try {
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/advanced` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForSelector(
      `select[id="server_allow_sender"]`
    );

    await options.puppetInstance.page.select(
      'select[id="server_allow_sender"]',
      'false'
    );

    const sendLimitValue = await setAndGetLimits(
      'input[id="server_send_limit"]',
      options.sendLimit
    );
    const outboundSpamThresholdValue = await setAndGetLimits(
      'input[id="server_outbound_spam_threshold"]',
      options.outboundSpamThreshold
    );
    const messageRetentionDaysValue = await setAndGetLimits(
      'input[id="server_message_retention_days"]',
      options.messageRetentionDays
    );
    const rawMessageRetentionDaysValue = await setAndGetLimits(
      'input[id="server_raw_message_retention_days"]',
      options.rawMessageRetentionDays
    );
    const rawMessageRetentionSizeValue = await setAndGetLimits(
      'input[id="server_raw_message_retention_size"]',
      options.rawMessageRetentionSize
    );

    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      orgId: options.orgId,
      serverId: options.serverId,
      sendLimit: sendLimitValue,
      outboundSpamThreshold: outboundSpamThresholdValue,
      messageRetentionDays: messageRetentionDaysValue,
      rawMessageRetentionDays: rawMessageRetentionDaysValue,
      rawMessageRetentionSize: rawMessageRetentionSizeValue
    };
  } catch (error: any) {
    console.log('Postal: setMailServerConfig Error:', error);
    throw new Error(error);
  }
}
