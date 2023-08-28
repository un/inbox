import type { PuppetInstance } from '../index';

export async function setOrgIpPools(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  poolId: string | string[]
): Promise<{
  data: { orgId: string; pools: string[] } | null;
  error: Error | null;
}> {
  try {
    const poolIds = Array.isArray(poolId) ? poolId : [poolId];
    const enabledPools = [];
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/ip_pools`
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForSelector(`input[type='checkbox']`);
    const poolCheckboxes = await puppetInstance.page.$$(
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
    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        pools: enabledPools
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: setOrgIpPools Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
