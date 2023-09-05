import type { PuppetInstance } from '../index';

export async function addMailServer(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  defaultIpPoolId: string;
}): Promise<{
  orgId: number;
  serverId: string;
  ipPool: string;
}> {
  try {
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/new` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page
      .locator(`[id="server_name"]`)
      .fill(options.serverId);
    await options.puppetInstance.page.select(
      'select[id="server_ip_pool_id"]',
      options.defaultIpPoolId.split('_')[2]
    );
    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();

    return {
      orgId: options.orgId,
      serverId: options.serverId,
      ipPool: options.defaultIpPoolId
    };
  } catch (error: any) {
    console.log('Postal: addMailServer Error:', error);
    throw new Error(error);
  }
}
