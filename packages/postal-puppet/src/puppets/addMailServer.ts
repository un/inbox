import type { PuppetInstance } from '../index';

export async function addMailServer(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  serverId: string,
  defaultIpPoolId: string
): Promise<{
  data: { orgId: string; serverId: string; ipPool: string } | null;
  error: Error | null;
}> {
  try {
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/new` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.locator(`[id="server_name"]`).fill(serverId);
    await puppetInstance.page.select(
      'select[id="server_ip_pool_id"]',
      defaultIpPoolId.split('_')[2]
    );
    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        serverId,
        ipPool: defaultIpPoolId
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
