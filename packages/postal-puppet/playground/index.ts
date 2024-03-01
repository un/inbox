import { postalPuppet } from '../src';
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
const { puppetInstance } = await postalPuppet.initPuppet({
  postalControlPanel: config.postalControlPanel,
  postalUrl: config.postalUrl,
  postalUser: config.postalUser,
  postalPass: config.postalPass
});
if (!puppetInstance) throw new Error(`Failed to initialize puppet:`);

//* Create Org
// const org = await postalPuppet.createOrg(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId
// );
// console.log(org);

//* Set OrgIP Pools
// const ipPools = await postalPuppet.setOrgIpPools(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.defaultPoolId
// );
// console.log(ipPools);

//* Add Domain
// const domain = await postalPuppet.addDomain(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.domainName
// );
// console.log(domain);

// //* Add Mail Server
// const mailServer = await postalPuppet.addMailServer(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.defaultPoolId
// );
// console.log(mailServer);

//* Set mail server config
// const mailServerConfig = await postalPuppet.setMailServerConfig(
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
// const mailServerEventWebhooks = await postalPuppet.setMailServerEventWebhooks(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerEventWebhooks);

//* Set mail server API key
// const mailServerApiKey = await postalPuppet.setMailServerApiKey(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId
// );
// console.log(mailServerApiKey);

//* Set mail server SMTP key
// const mailServerSmtpKey = await postalPuppet.setMailServerSmtpKey(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId
// );
// console.log(mailServerSmtpKey);

//* Set the servers httpEndpoint to mailbridge
// const mailServerRoutingHttpEndpoint = await postalPuppet.setMailServerRoutingHttpEndpoint(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerRoutingHttpEndpoint);

//! * Set the mail server routes
// const mailServerRoute = await postalPuppet.setMailServerRoute(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.mailBridgeUrl
// );
// console.log(mailServerRoute);

//* Set the mail server route for domain
// const mailServerRoute = await postalPuppet.setMailServerRouteForDomain(
//   puppetInstance,
//   tempVars.orgId,
//   tempVars.orgPublicId,
//   tempVars.mailServerId,
//   tempVars.domainName
// );
// console.log(mailServerRoute);

await postalPuppet.closePuppet(puppetInstance);

console.timeEnd('⏱️ Time to run');
