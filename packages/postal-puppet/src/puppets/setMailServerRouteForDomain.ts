import type { PuppetInstance } from '../index';

export async function setMailServerRouteForDomain(
  puppetInstance: PuppetInstance,
  orgId: number,
  orgPublicId: string,
  serverId: string,
  domainName: string
): Promise<{
  data: {
    orgId: number;
    serverId: string;
    domainName: string;
    forwardingAddress: string;
  } | null;
  error: Error | null;
}> {
  try {
    puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // get ID of http endpoint matching name 'uninbox-mail-bridge-http'
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/http_endpoints` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="endpointList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    const configuredEndpoint = await puppetInstance.page.$(
      'a div ::-p-text(uninbox-mail-bridge-http)'
    );

    if (!configuredEndpoint)
      throw new Error(
        `No httpEndpoints were found when adding mail server route for: ${serverId}`
      );

    await puppetInstance.page
      .locator('a div ::-p-text(uninbox-mail-bridge-http)')
      .click();

    await puppetInstance.page.waitForNetworkIdle();
    const pageUrl = puppetInstance.page.url();
    const httpEndpointId = pageUrl.match(/\/http_endpoints\/(.*?)\/edit/)?.[1];

    // check if route for domain already exists
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/routes` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="routeList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    const existingDomainRoute = await puppetInstance.page.$(
      `::-p-text(\\*\\@${domainName})`
    );

    // if route exists, edit it and set the endpoint to the correct one
    if (existingDomainRoute) {
      await existingDomainRoute.click();
      await puppetInstance.page.waitForNetworkIdle();

      await puppetInstance.page.select(
        'select[id="route__endpoint"]',
        `HTTPEndpoint#${httpEndpointId}`
      );

      await puppetInstance.page.click('[name="commit"]');
      await puppetInstance.page.waitForNetworkIdle();
    }

    // if route dosnt exist, create it
    if (!existingDomainRoute) {
      await puppetInstance.page.goto(
        `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/routes/new` as string
      );
      await puppetInstance.page.waitForNetworkIdle();

      await puppetInstance.page.locator('input[id="route_name"]').fill('*');

      // We need to find the value of the dropdown item related to the domain. Selecting via text is not possible
      const domainDropdownValue = await puppetInstance.page.evaluate(
        (domain) => {
          //@ts-expect-error  - TS doesn't know it's running in the browser context
          const select = document.querySelector('#route_domain_id');
          const options = Array.from(select.options);
          for (let i = 0; i < options.length; i++) {
            //@ts-expect-error  - TS doesn't know it's running in the browser context
            const option = options[i] as HTMLOptionElement;
            if (option.innerText === domain) {
              return option.value;
            }
          }
          return null;
        },
        domainName
      );

      await puppetInstance.page.select(
        'select[id="route_domain_id"]',
        domainDropdownValue
      );

      await puppetInstance.page.select(
        'select[id="route__endpoint"]',
        `HTTPEndpoint#${httpEndpointId}`
      );

      await puppetInstance.page.click('[name="commit"]');
      await puppetInstance.page.waitForNetworkIdle();

      console.log('no existing route found');
    }

    // get forwarding address from the route
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/routes` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="routeList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    await puppetInstance.page.locator(`::-p-text(\\*\\@${domainName})`).click();
    await puppetInstance.page.waitForNetworkIdle();
    const forwardingAddress = await puppetInstance.page.$eval(
      'input[id="route_forward_address"]',
      (address) => address.value
    );

    return {
      data: {
        orgId,
        serverId,
        domainName,
        forwardingAddress
      },
      error: null
    };
  } catch (error: any) {
    return {
      data: null,
      error: error
    };
  }
}
