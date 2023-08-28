import type { PuppetInstance } from '../index';

export async function setMailServerConfig(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  serverId: string,
  sendLimit?: number,
  outboundSpamThreshold?: number,
  messageRetentionDays?: number,
  rawMessageRetentionDays?: number,
  rawMessageRetentionSize?: number
): Promise<{
  data: {
    orgId: string;
    serverId: string;
    sendLimit: number;
    outboundSpamThreshold: number;
    messageRetentionDays: number;
    rawMessageRetentionDays: number;
    rawMessageRetentionSize: number;
  } | null;
  error: Error | null;
}> {
  async function setAndGetLimits(
    selector: string,
    newLimit: number | undefined
  ): Promise<number> {
    // await puppetInstance.page.select(selector, 'custom');
    const inputElement = await puppetInstance.page.locator(selector);
    newLimit && (await inputElement.fill(newLimit.toString()));
    //@ts-ignore
    const finalValue = +(await inputElement.map((el) => el.value).wait());
    return finalValue;
  }
  try {
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/advanced` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForSelector(
      `select[id="server_allow_sender"]`
    );

    await puppetInstance.page.select(
      'select[id="server_allow_sender"]',
      'false'
    );

    const sendLimitValue = await setAndGetLimits(
      'input[id="server_send_limit"]',
      sendLimit
    );
    const outboundSpamThresholdValue = await setAndGetLimits(
      'input[id="server_outbound_spam_threshold"]',
      outboundSpamThreshold
    );
    const messageRetentionDaysValue = await setAndGetLimits(
      'input[id="server_message_retention_days"]',
      messageRetentionDays
    );
    const rawMessageRetentionDaysValue = await setAndGetLimits(
      'input[id="server_raw_message_retention_days"]',
      rawMessageRetentionDays
    );
    const rawMessageRetentionSizeValue = await setAndGetLimits(
      'input[id="server_raw_message_retention_size"]',
      rawMessageRetentionSize
    );

    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        serverId,
        sendLimit: sendLimitValue,
        outboundSpamThreshold: outboundSpamThresholdValue,
        messageRetentionDays: messageRetentionDaysValue,
        rawMessageRetentionDays: rawMessageRetentionDaysValue,
        rawMessageRetentionSize: rawMessageRetentionSizeValue
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: setMailServerConfig Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
