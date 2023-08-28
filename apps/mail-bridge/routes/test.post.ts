import { postalPuppet } from '../puppets';

export default eventHandler(async (event) => {
  const body = await readBody(event);
  const puppetInstance = await postalPuppet.initPuppet();
  const returns = await postalPuppet.createOrg(puppetInstance, body.orgName);
  const { data: domainData, error: domainError } = await postalPuppet.addDomain(
    puppetInstance,
    body.orgName,
    body.domainName
  );
  if (domainError) {
    throw new Error(JSON.stringify(domainError));
  }
  console.log(domainData.dkimKey);
  await postalPuppet.closePuppet(puppetInstance);
  return { status: "I'm Alive 🏝️", returns };
});
