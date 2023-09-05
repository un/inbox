import type { PuppetInstance } from '../index';

export async function setOrgIpPools(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  poolId: string | string[];
}): Promise<{
  orgId: number;
  pools: string[];
}> {
  try {
    const poolIds = Array.isArray(options.poolId)
      ? options.poolId
      : [options.poolId];
    const enabledPools = [];
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/ip_pools`
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForSelector(`input[type='checkbox']`);
    const poolCheckboxes = await options.puppetInstance.page.$$(
      `input[type='checkbox']`
    );

    for (const checkBox of poolCheckboxes) {
      const checkBoxId = await (await checkBox.getProperty('id')).jsonValue();
      const status = await (await checkBox.getProperty('checked')).jsonValue();
      if (poolIds.includes(checkBoxId) && !status) {
        await checkBox.click(); // enable the checkbox
        enabledPools.push(checkBoxId);
      }
      if (!poolIds.includes(checkBoxId) && status) {
        await checkBox.click(); // disable the checkbox
      }
    }
    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      orgId: options.orgId,
      pools: enabledPools
    };
  } catch (error: any) {
    console.log('Postal: setOrgIpPools Error:', error);
    throw new Error(error);
  }
}
