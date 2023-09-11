import type { PuppetInstance } from '../index';

export async function setMailServerRouteForDomain(options: {
  puppetInstance: PuppetInstance;
  orgId: number;
  orgPublicId: string;
  serverId: string;
  domainName: string;
  username?: string;
}): Promise<{
  orgId: number;
  serverId: string;
  domainName: string;
  forwardingAddress: string;
  username: string;
}> {
  try {
    options.puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    const username = options.username || '*';
    // get ID of http endpoint matching name 'uninbox-mail-bridge-http'
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/http_endpoints` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="endpointList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    const configuredEndpoint = await options.puppetInstance.page.$(
      'a div ::-p-text(uninbox-mail-bridge-http)'
    );

    if (!configuredEndpoint)
      throw new Error(
        `No httpEndpoints were found when adding mail server route for: ${options.serverId}`
      );

    await options.puppetInstance.page
      .locator('a div ::-p-text(uninbox-mail-bridge-http)')
      .click();

    await options.puppetInstance.page.waitForNetworkIdle();
    const pageUrl = options.puppetInstance.page.url();
    const httpEndpointId = pageUrl.match(/\/http_endpoints\/(.*?)\/edit/)?.[1];

    // check if route for domain already exists
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/routes` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();
    await options.puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="routeList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    const existingDomainRoute = await options.puppetInstance.page.$(
      `::-p-text(${username}\\@${options.domainName})`
    );

    // if route exists, edit it and set the endpoint to the correct one
    if (existingDomainRoute) {
      await existingDomainRoute.click();
      await options.puppetInstance.page.waitForNetworkIdle();

      await options.puppetInstance.page.select(
        'select[id="route__endpoint"]',
        `HTTPEndpoint#${httpEndpointId}`
      );

      await options.puppetInstance.page.click('[name="commit"]');
      await options.puppetInstance.page.waitForNetworkIdle();
    }

    // if route dosnt exist, create it
    if (!existingDomainRoute) {
      await options.puppetInstance.page.goto(
        `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/routes/new` as string
      );
      await options.puppetInstance.page.waitForNetworkIdle();

      await options.puppetInstance.page
        .locator('input[id="route_name"]')
        .fill(username);

      // We need to find the value of the dropdown item related to the domain. Selecting via text is not possible
      const domainDropdownValue = await options.puppetInstance.page.evaluate(
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
        options.domainName
      );

      await options.puppetInstance.page.select(
        'select[id="route_domain_id"]',
        domainDropdownValue
      );

      await options.puppetInstance.page.select(
        'select[id="route__endpoint"]',
        `HTTPEndpoint#${httpEndpointId}`
      );

      await options.puppetInstance.page.click('[name="commit"]');
      await options.puppetInstance.page.waitForNetworkIdle();
    }

    // get forwarding address from the route
    await options.puppetInstance.page.goto(
      `${options.puppetInstance.url}/org/${options.orgPublicId}/servers/${options.serverId}/routes` as string
    );
    await options.puppetInstance.page.waitForNetworkIdle();

    const escapedUsername = username === '*' ? '\\*' : username;
    const routeEmail = escapedUsername + '\\@' + options.domainName;
    await options.puppetInstance.page
      .locator(`::-p-text(${routeEmail})`)
      .click();
    await options.puppetInstance.page.waitForNetworkIdle();
    const forwardingAddress = await options.puppetInstance.page.$eval(
      'input[id="route_forward_address"]',
      (address) => address.value
    );
    console.log({ forwardingAddress });

    return {
      orgId: options.orgId,
      serverId: options.serverId,
      domainName: options.domainName,
      username: options.username || '*',
      forwardingAddress
    };
  } catch (error: any) {
    throw new Error(error);
  }
}
