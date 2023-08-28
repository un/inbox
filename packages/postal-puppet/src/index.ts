import type { Browser, Page } from 'puppeteer';
export { initPuppet } from './puppets/initPuppet';
export { closePuppet } from './puppets/closePuppet';
export { addDomain } from './puppets/addDomain';
export { addMailServer } from './puppets/addMailServer';
export { createOrg } from './puppets/createOrg';
export { setMailServerApiKey } from './puppets/setMailServerApiKey';
export { setMailServerSmtpKey } from './puppets/setMailServerSmtpKey';
export { setMailServerConfig } from './puppets/setMailServerConfig';
export { setMailServerEventWebhooks } from './puppets/setMailServerEventWebhooks';
export { setMailServerRoute } from './puppets/setMailServerRoute';
export { setMailServerRouteForDomain } from './puppets/setMailServerRouteForDomain';
export { setMailServerRoutingHttpEndpoint } from './puppets/setMailServerRoutingHttpEndpoint';
export { setOrgIpPools } from './puppets/setOrgIpPools';
export type PuppetInstance = {
  browser: Browser;
  page: Page;
  url: string;
};
