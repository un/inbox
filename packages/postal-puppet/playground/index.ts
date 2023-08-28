import {
  addDomain,
  addMailServer,
  closePuppet,
  createOrg,
  initPuppet,
  setMailServerApiKey,
  setMailServerSmtpKey,
  setMailServerConfig,
  setMailServerEventWebhooks,
  setOrgIpPools,
  setMailServerRoutingHttpEndpoint,
  setMailServerRoute,
  setMailServerRouteForDomain
} from '../src';
import { useRuntimeConfig } from './config';

const config = useRuntimeConfig();
const tempVars = {
  orgId: 'testOrg',
  orgPublicId: 'orgPublicId',
  defaultPoolId: 'ip_pool_2',
  domainName: 'local-test.uninbox.dev',
  domainPostalId: '544db0b9-9d84-401f-86a2-469697261521',
  mailServerId: 'm74negvx9jxg150x',
  mailBridgeUrl: 'https://mail.bridge.uninbox.dev'
};

console.time('⏱️ Time to run');
const { puppetInstance, error } = await initPuppet(
  config.postalControlPanel,
  config.postalUrl,
  config.postalUser,
  config.postalPass
);
if (error || !puppetInstance)
  throw new Error(`Failed to initialize puppet: ${error}`);

//* Create Org
// const org = await createOrg(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId
// );
// console.log(org);

//* Set OrgIP Pools
// const ipPools = await setOrgIpPools(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.defaultPoolId
// );
// console.log(ipPools);

//* Add Domain
// const domain = await addDomain(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.domainName
// );
// console.log(domain);

// //* Add Mail Server
// const mailServer = await addMailServer(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.defaultPoolId
// );
// console.log(mailServer);

//* Set mail server config
// const mailServerConfig = await setMailServerConfig(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   30,
//   10,
//   7,
//   7,
//   256
// );
// console.log(mailServerConfig);

//* Set Mailserver event Webhook
// const mailServerEventWebhooks = await setMailServerEventWebhooks(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerEventWebhooks);

//* Set mail server API key
// const mailServerApiKey = await setMailServerApiKey(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId
// );
// console.log(mailServerApiKey);

//* Set mail server SMTP key
// const mailServerSmtpKey = await setMailServerSmtpKey(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId
// );
// console.log(mailServerSmtpKey);

//* Set the servers httpEndpoint to mailbridge
// const mailServerRoutingHttpEndpoint = await setMailServerRoutingHttpEndpoint(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerRoutingHttpEndpoint);

//! * Set the mail server routes
// const mailServerRoute = await setMailServerRoute(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerRoute);

//* Set the mail server route for domain
const mailServerRoute = await setMailServerRouteForDomain(
  puppetInstance,
  tempVars.orgId,
  tempVars.orgPublicId,
  tempVars.mailServerId,
  tempVars.domainName
);
console.log(mailServerRoute);

await closePuppet(puppetInstance);

console.timeEnd('⏱️ Time to run');
