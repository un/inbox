import type { postalEmailPayload } from '../../../../types';
/**
 * used for all incoming mail from Postal
 */
function getType(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function checkPayloadAgainstType(payload: any): string[] {
  const expectedTypes: { [key: string]: string } = {
    id: 'number',
    rcpt_to: 'string',
    mail_from: 'string',
    token: 'string',
    subject: 'string',
    message_id: 'string',
    timestamp: 'number',
    size: 'string',
    spam_status: 'string', // 'Spam' | 'NotSpam'
    bounce: 'boolean',
    received_with_ssl: 'boolean,null',
    to: 'string',
    cc: 'string,null',
    from: 'string',
    date: 'string', // Date is an object in JavaScript
    in_reply_to: 'string,null',
    references: 'string,null',
    plain_body: 'string',
    html_body: 'string',
    auto_submitted: 'string,null', // 'no' | 'auto-generated' | 'auto-replied' | 'auto-notified'
    attachment_quantity: 'number',
    attachments: 'array',
    replies_from_plain_body: 'string,null'
  };

  const missingKeys: string[] = [];
  const incorrectTypeKeys: string[] = [];

  Object.entries(expectedTypes).forEach(([key, expectedType]) => {
    const value = payload[key];
    const actualType = getType(value);
    const exists = key in payload;
    const typeMatches = expectedType.split(',').includes(actualType);

    console.log(
      `Key: ${key}, Exists: ${exists}, Expected Type: ${expectedType}, Actual Type: ${actualType}, Type Matches: ${typeMatches}`
    );

    if (!exists) {
      missingKeys.push(key);
    } else if (!typeMatches) {
      incorrectTypeKeys.push(key);
    }
  });

  console.log('Incorrect Type Keys:', incorrectTypeKeys);
  return missingKeys;
}

export default eventHandler(async (event) => {
  const [orgId, mailserverId] = event.context.params.mailServer.split('/');

  const body = await readBody(event);

  const missingKeys = checkPayloadAgainstType(body);
  if (missingKeys.length > 0) {
    console.log('Missing keys:', missingKeys);
    // Handle the case where some keys are missing
  }

  return { status: "I'm Alive 🏝️" };
});
