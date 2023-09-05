import type { PuppetInstance } from '../index';

export async function createOrg(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
}): Promise<{
  data: { orgId: number; postalOrgId: string } | null;
  error: Error | null;
}> {
  try {
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/organizations/new` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();

    await options.puppetInstance.page
      .locator('[id="organization_name"]')
      .fill(options.orgPublicId);
    await options.puppetInstance.page
      .locator('[id="organization_permalink"]')
      .fill(options.orgPublicId.toLowerCase());
    await options.puppetInstance.page.click('[name="commit"]');
    await options.puppetInstance.page.waitForNetworkIdle();
    return {
      data: {
        orgId: options.orgId,
        postalOrgId: options.orgPublicId
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: createOrg Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
