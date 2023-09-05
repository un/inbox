import type { PuppetInstance } from '../index';

export async function setMailServerRoute(
  puppetInstance: PuppetInstance,
  orgId: number,
  orgPublicId: string,
  serverId: string
): Promise<{
  data: {
    orgId: number;
    serverId: string;
    //httpEndpointUrl: string;
  } | null;
  error: Error | null;
}> {
  try {
    throw new Error(
      '🚨 setMailServerRoute is depreciated!!! use setMailServerRouteForDomain instead'
    );

    puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // go to org/domains
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/domains` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="domainList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    const orgDomains = [];
    const orgDomainElements = await puppetInstance.page.$$(
      'p[class="domainList__name"] >>> a'
    );

    if (!orgDomainElements.length)
      throw new Error(
        `No domains found when adding mail server route for: ${serverId}`
      );

    for (const domain of orgDomainElements) {
      orgDomains.push(
        await (await domain.getProperty('textContent')).jsonValue()
      );
    }

    // get ID of route matching name 'uninbox-mail-bridge-http'
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

    // Extract existing routes for deletion later
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

    const preexistingRouteUrls = await puppetInstance.page.$$eval(
      'a[class="routeList__link"]',
      //@ts-expect-error  - TS doesn't know it's running in the browser context
      (anchors) => anchors.map((link) => (link as HTMLLinkElement).href)
    );
    // delete old preexisting routes
    for (const oldRouteUrl of preexistingRouteUrls) {
      await puppetInstance.page.goto(oldRouteUrl as string);
      await puppetInstance.page.waitForNetworkIdle();
      await puppetInstance.page
        .locator(`a[class="button button--danger"]`)
        .click();
      await puppetInstance.page.waitForNetworkIdle();
    }

    // add new route for each domain
    for (const domain of orgDomains) {
      await puppetInstance.page.goto(
        `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/routes/new` as string
      );
      await puppetInstance.page.waitForNetworkIdle();

      await puppetInstance.page.locator('input[id="route_name"]').fill('*');

      //We need to find the value of the dropdown item related to the domain. Selecting via text is not possible
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
        domain
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
    }

    // get the new routes (all current routes)
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/routes` as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    const newRouteAddresses: Array<{
      domainName: string;
      forwardAddress: string;
    }> = [];

    const newRouteUrls = await puppetInstance.page.$$eval(
      'a[class="routeList__link"]',
      //@ts-expect-error  - TS doesn't know it's running in the browser context
      (anchors) => anchors.map((link) => (link as HTMLLinkElement).href)
    );
    for (const newRouteUrl of newRouteUrls) {
      await puppetInstance.page.goto(newRouteUrl as string);
      await puppetInstance.page.waitForNetworkIdle();
      // find the route_domain_id dropdown and read the lable of the selected option
      const domainName = await puppetInstance.page.$eval(
        'select[id="route_domain_id"] >>> option[selected="selected"]',
        //@ts-expect-error  - TS doesn't know it's running in the browser context
        (option) => (option as HTMLOptionElement).innerText
      );

      const forwardAddress = await puppetInstance.page.$eval(
        'input[id="route_forward_address"]',
        (address) => address.value
      );

      await puppetInstance.page.click('[name="commit"]');
      await puppetInstance.page.waitForNetworkIdle();

      newRouteAddresses.push({ domainName, forwardAddress });
    }

    return {
      data: {
        orgId,
        serverId
        //httpEndpointUrl: endpointUrl
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
