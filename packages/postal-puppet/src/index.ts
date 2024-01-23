import type { Browser, Page } from 'puppeteer';
import { initPuppet } from './puppets/initPuppet';
import { closePuppet } from './puppets/closePuppet';
import { addDomain } from './puppets/addDomain';
import { refreshDomainDns } from './puppets/domainRefreshDns';
import { addMailServer } from './puppets/addMailServer';
import { createOrg } from './puppets/createOrg';
import { setMailServerApiKey } from './puppets/setMailServerApiKey';
import { setMailServerSmtpKey } from './puppets/setMailServerSmtpKey';
import { setMailServerConfig } from './puppets/setMailServerConfig';
import { setMailServerEventWebhooks } from './puppets/setMailServerEventWebhooks';
import { setMailServerRouteForDomain } from './puppets/setMailServerRouteForDomain';
import { setMailServerRoutingHttpEndpoint } from './puppets/setMailServerRoutingHttpEndpoint';
import { setOrgIpPools } from './puppets/setOrgIpPools';
export type PuppetInstance = {
  browser: Browser;
  page: Page;
  url: string;
};

export const postalPuppet = {
  initPuppet,
  closePuppet,
  addDomain,
  addMailServer,
  createOrg,
  refreshDomainDns,
  setMailServerApiKey,
  setMailServerSmtpKey,
  setMailServerConfig,
  setMailServerEventWebhooks,
  setMailServerRouteForDomain,
  setMailServerRoutingHttpEndpoint,
  setOrgIpPools
};
