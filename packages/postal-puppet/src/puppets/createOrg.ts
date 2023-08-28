import type { PuppetInstance } from '../index';

export async function createOrg(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string
): Promise<{
  data: { orgId: string; postalOrgId: string } | null;
  error: Error | null;
}> {
  try {
    await puppetInstance.page.goto(
      `${puppetInstance.url}/organizations/new` as string
    );
    await puppetInstance.page.waitForNetworkIdle();

    await puppetInstance.page
      .locator('[id="organization_name"]')
      .fill(orgPublicId);
    await puppetInstance.page
      .locator('[id="organization_permalink"]')
      .fill(orgPublicId.toLowerCase());
    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();
    return {
      data: {
        orgId: orgId,
        postalOrgId: orgPublicId
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
