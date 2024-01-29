import type { PuppetInstance } from '../index';

export async function refreshDomainDns(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  domainId: string;
  orgPublicId: string;
}): Promise<{
  success: boolean;
}> {
  try {
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/domains/${options.domainId}/setup` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    const refreshButton = await options.puppetInstance.page.waitForSelector(
      'a ::-p-text(Check my records are correct)'
    );
    if (!refreshButton) throw new Error('Refresh button not found');
    refreshButton.click();
    await options.puppetInstance.page.waitForNetworkIdle();
    return { success: true };
  } catch (error: any) {
    console.log('Postal: refreshDomainDns Error:', error);
    throw new Error(error);
  }
}
