import { db } from '@u22n/database';
import { simpleParser } from 'mailparser';
import { authenticate } from 'mailauth';
import { spf } from 'mailauth/lib/spf';
import { and, eq, inArray } from '@u22n/database/orm';
import {
  contactGlobalReputations,
  contacts,
  convoEntries,
  emailIdentities,
  emailRoutingRules,
  postalServers
} from '@u22n/database/schema';
import { parseMessage } from '@u22n/mailtools';
import type {
  MessageParseAddressPlatformObject,
  postalEmailPayload
} from '../../../../types';
import { nanoId } from '@u22n/utils';
/**
 * used for all incoming mail from Postal
 */

export default eventHandler(async (event) => {
  sendNoContent(event, 200);
  console.log('🔥 new event');
  console.time('⌛ Timer');

  //! let emailType: 'reply' | 'newConvo' | 'marketing' | 'newsletter' | 'other';
  const [orgIdStr, mailserverId] = event.context.params.mailServer.split('/');
  const orgId = Number(orgIdStr);

  //verify the mailserver actually exists
  const mailServer = await db.query.postalServers.findFirst({
    where: eq(postalServers.publicId, mailserverId),
    columns: {
      id: true,
      publicId: true,
      orgId: true
    }
  });
  if (!mailServer || +mailServer.orgId !== orgId) {
    return;
  }

  // read and decode the email payload
  const {
    id: payloadPostalEmailId,
    rcpt_to: payloadEmailTo,
    mail_from: payloadEmailFrom,
    message: payloadEmailB64
  }: postalEmailPayload = await readBody(event);
  if (typeof payloadEmailB64 !== 'string') {
    console.error('⛔ no email payload, skipping processing', {
      orgId,
      mailserverId,
      payloadPostalEmailId
    });
    return;
  }

  // parse the email payload
  const payloadEmail = Buffer.from(payloadEmailB64, 'base64').toString('utf-8');
  const parsedEmail = await simpleParser(payloadEmail);

  // verify email auth (DKIM, SPF, etc.) - unhandled right now
  const auth = await authenticate(payloadEmail, {
    trustReceived: true
  });

  // Extract key email properties
  if (parsedEmail.from.value.length > 1) {
    console.error(
      '⛔ multiple from addresses detected in a message, only using first email address',
      { payloadPostalEmailId }
    );
  }

  const messageFrom = parsedEmail.from.value;
  const messageTo = Array.isArray(parsedEmail.to)
    ? parsedEmail.to.map((a) => a.value).flat()
    : parsedEmail.to.value;
  const messageCc = parsedEmail.cc
    ? Array.isArray(parsedEmail.cc)
      ? parsedEmail.cc.map((a) => a.value).flat()
      : parsedEmail.cc.value
    : null;
  const inReplyToEmailId = parsedEmail.inReplyTo
    ? parsedEmail.inReplyTo.replace(/^<|>$/g, '')
    : null;
  const subject =
    parsedEmail.subject.replace(/^(RE:|FW:)\s*/i, '').trim() || '';
  const messageId = parsedEmail.messageId.replace(/^<|>$/g, '') || '';
  const date = parsedEmail.date;
  const messageBodyHtml = (parsedEmail.html as string).replace(/\n/g, '') || '';

  // parse the email HTML and clean it up
  const parsedEmailMessage = parseMessage(messageBodyHtml, {
    cleanQuotations: true,
    cleanSignatures: true,
    enhanceLinks: true,
    autolink: true,
    noRemoteContent: true,
    cleanStyles: true
  });

  // get the contact and emailIdentityIds for the message
  const [messageToIds, messageFromIds, messageCcIds]: [
    MessageParseAddressPlatformObject[],
    MessageParseAddressPlatformObject[],
    MessageParseAddressPlatformObject[] | []
  ] = await Promise.all([
    parseAddressIds({ addresses: messageTo, addressType: 'to', orgId: orgId }),
    parseAddressIds({
      addresses: messageFrom,
      addressType: 'from',
      orgId: orgId
    }),
    messageCc
      ? parseAddressIds({ addresses: messageCc, addressType: 'cc', orgId })
      : Promise.resolve([])
  ]);
  const messageAddressIds = [
    ...(Array.isArray(messageToIds) ? messageToIds : []),
    ...(Array.isArray(messageFromIds) ? messageFromIds : []),
    ...(Array.isArray(messageCcIds) ? messageCcIds : [])
  ];
  console.log({ messageAddressIds });

  // extract the IDs of all the entries in messageAddressIds where the type = 'emailIdentity'
  const emailIdentityIds = messageAddressIds
    .filter((a) => a.type === 'emailIdentity')
    .map((a) => a.id);

  // if theres no email identity ids, then we assume that this email has no destination, so we need to send the bounce message
  if (!emailIdentityIds.length) {
    //! SEND BOUNCE MESSAGE
    console.error('⛔ no email identity ids found', { messageAddressIds });
    return;
  }

  // get the routing rule destinations for each of the email addresses, then get the users and contacts within those routing rules

  const routingRuleUserGroupIds: number[] = [];
  const routingRuleOrgMemberIds: number[] = [];

  const emailIdentityResponse = await db.query.emailIdentities.findMany({
    where: and(
      eq(emailIdentities.orgId, orgId),
      inArray(emailIdentities.id, emailIdentityIds)
    ),
    columns: {
      id: true
    },
    with: {
      routingRules: {
        columns: {
          id: true
        },
        with: {
          destinations: {
            columns: {
              groupId: true,
              orgMemberId: true
            }
          }
        }
      }
    }
  });

  console.log({ emailIdentityResponse });
  console.log({ routing: emailIdentityResponse[0].routingRules.destinations });

  // if the email has a reply to header, then we need to check if a message exists in the system with that reply to id
  // - if yes, then we append the message to that existing convo
  // - if no, then we assume this is a new convo and handle it at such
  if (inReplyToEmailId) {
    const existingMessage = await db.query.convoEntries.findFirst({
      where: and(
        eq(convoEntries.orgId, orgId),
        eq(convoEntries.emailMessageId, inReplyToEmailId)
      ),
      columns: {
        id: true,
        convoId: true
      },
      with: {
        convo: {
          columns: {
            id: true
          },
          with: {
            participants: {
              columns: {
                contactId: true,
                userGroupId: true,
                orgMemberId: true
              }
            }
          }
        }
      }
    });

    if (existingMessage) {
      // check all the contacts in the incoming email are included in the convo participants
      // - if not, then add them to the convo participants
      // to do this, we need to get the routing rules for each of the email participants, build an array of users, and build an array of groups
      // then we should compare how everything looks together

      // append the message to the existing convo
      console.log('🔥 appending to existing convo', { existingMessage });
    }

    if (!existingMessage) {
      console.log('🔥 no existing message found', { inReplyToEmailId });
    }

    console.log({ existingMessage });
  }

  // return { status: "I'm Alive 🏝️" };
  console.timeEnd('⌛ Timer');
});
