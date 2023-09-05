import type { PuppetInstance } from '../index';

export async function addMailServer(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  defaultIpPoolId: string;
}): Promise<{
  data: { orgId: number; serverId: string; ipPool: string } | null;
  error: Error | null;
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
      data: {
        orgId: options.orgId,
        serverId: options.serverId,
        ipPool: options.defaultIpPoolId
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: addMailServer Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
