import { db } from '@u22n/database';
import { simpleParser } from 'mailparser';
import { authenticate } from 'mailauth';
import { spf } from 'mailauth/lib/spf';
import { and, eq, inArray } from '@u22n/database/orm';
import type { InferInsertModel } from '@u22n/database/orm';
import {
  ConvoEntryMetadata,
  contactGlobalReputations,
  contacts,
  convoEntries,
  convoParticipants,
  emailIdentities,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  postalServers
} from '@u22n/database/schema';
import { parseMessage } from '@u22n/mailtools';
import type {
  MessageParseAddressPlatformObject,
  postalEmailPayload
} from '../../../../types';
import { nanoId } from '@u22n/utils';
import { tiptapCore, tiptapHtml } from '@u22n/tiptap';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
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
  const parsedEmailMessage = await parseMessage(messageBodyHtml, {
    cleanQuotations: true,
    cleanSignatures: true,
    enhanceLinks: true,
    autolink: true,
    noRemoteContent: true,
    cleanStyles: true
  });

  // get the contact and emailIdentityIds for the message
  const [
    messageToPlatformObject,
    messageFromPlatformObject,
    messageCcPlatformObject
  ]: [
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
    ...(Array.isArray(messageToPlatformObject) ? messageToPlatformObject : []),
    ...(Array.isArray(messageFromPlatformObject)
      ? messageFromPlatformObject
      : []),
    ...(Array.isArray(messageCcPlatformObject) ? messageCcPlatformObject : [])
  ];
  console.log({ messageAddressIds });

  // extract the IDs of all the entries in messageAddressIds where the type = 'emailIdentity'
  const emailIdentityIds = messageAddressIds
    .filter((a) => a.type === 'emailIdentity')
    .map((a) => a.id);
  const contactIds = messageAddressIds
    .filter((a) => a.type === 'contact')
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
  emailIdentityResponse.forEach((emailIdentity) => {
    emailIdentity.routingRules.destinations.forEach((destination) => {
      if (destination.groupId) {
        routingRuleUserGroupIds.push(destination.groupId);
      } else if (destination.orgMemberId) {
        routingRuleOrgMemberIds.push(destination.orgMemberId);
      }
    });
  });

  console.log({ emailIdentityResponse });
  console.log({ routing: emailIdentityResponse[0].routingRules.destinations });

  let convoId: number | null = null;
  type ConvoParticipantInsertDbType = InferInsertModel<
    typeof convoParticipants
  >;
  // if the email has a reply to header, then we need to check if a message exists in the system with that reply to id
  // - if yes, then we append the message to that existing convo
  // - if no, then we assume this is a new convo and handle it at such
  if (inReplyToEmailId) {
    console.log('🔥 reply to email id', inReplyToEmailId);
    const existingMessage = await db.query.convoEntries.findFirst({
      where: and(
        eq(convoEntries.orgId, orgId),
        eq(convoEntries.emailMessageId, inReplyToEmailId)
      ),
      columns: {
        id: true,
        convoId: true,
        subjectId: true
      },
      with: {
        convo: {
          columns: {
            id: true
          },
          with: {
            participants: {
              columns: {
                id: true,
                contactId: true,
                userGroupId: true,
                orgMemberId: true
              }
            }
          }
        },
        subject: {
          columns: {
            id: true,
            subject: true
          }
        }
      }
    });

    let fromAddressParticipantId: number | null = null;
    const fromAddressPlatformObject = messageFromPlatformObject.find(
      (a) => a.ref === 'from'
    );
    if (fromAddressPlatformObject.type === 'contact') {
      //check if the contact id is already in the convo participants
      const contactAlreadyInConvo = existingMessage.convo.participants.find(
        (p) => p.contactId === fromAddressPlatformObject.id
      );
      if (contactAlreadyInConvo) {
        fromAddressParticipantId = contactAlreadyInConvo.id;
      }
      // if not in the convo, we'll set their id later
    }

    if (existingMessage) {
      convoId = existingMessage.convoId;

      // is the new message author already a participant in the convo?
      // - if not, then add them to the convo participants separately and save their participant id
      const newConvoParticipantsToAdd: ConvoParticipantInsertDbType[] = [];

      // check all the contacts, users and groups in the incoming email are included in the convo participants
      const existingConvoParticipantsContactIds =
        existingMessage.convo.participants.map((p) => p.contactId);
      const missingContacts = contactIds.filter(
        (c) => !existingConvoParticipantsContactIds.includes(c)
      );
      const existingConvoParticipantsOrgMemberIds =
        existingMessage.convo.participants.map((p) => p.orgMemberId);
      const missingOrgMembers = routingRuleOrgMemberIds.filter(
        (c) => !existingConvoParticipantsOrgMemberIds.includes(c)
      );
      const existingConvoParticipantsUserGroupIds =
        existingMessage.convo.participants.map((p) => p.userGroupId);
      const missingUserGroups = routingRuleUserGroupIds.filter(
        (c) => !existingConvoParticipantsUserGroupIds.includes(c)
      );

      // - if not, then add them to the convo participants
      if (missingContacts.length) {
        newConvoParticipantsToAdd.push(
          ...missingContacts.map((contactId) => ({
            convoId: convoId,
            contactId: contactId,
            orgId: orgId,
            publicId: nanoId(),
            role: 'contributor' as const
          }))
        );
      }
      if (missingOrgMembers.length) {
        newConvoParticipantsToAdd.push(
          ...missingOrgMembers.map((orgMemberId) => ({
            convoId: convoId,
            orgMemberId: orgMemberId,
            orgId: orgId,
            publicId: nanoId(),
            role: 'contributor' as const
          }))
        );
      }
      if (missingUserGroups.length) {
        newConvoParticipantsToAdd.push(
          ...missingUserGroups.map((userGroupId) => ({
            convoId: convoId,
            userGroupId: userGroupId,
            orgId: orgId,
            publicId: nanoId(),
            role: 'contributor' as const
          }))
        );
      }
      if (newConvoParticipantsToAdd.length) {
        await db.insert(convoParticipants).values(newConvoParticipantsToAdd);
      }

      if (!fromAddressParticipantId) {
        if (fromAddressPlatformObject.type === 'contact') {
          const contactParticipant = await db.query.convoParticipants.findFirst(
            {
              where: and(
                eq(convoParticipants.orgId, orgId),
                eq(convoParticipants.convoId, convoId),
                eq(convoParticipants.contactId, fromAddressPlatformObject.id)
              ),
              columns: {
                id: true
              }
            }
          );
          fromAddressParticipantId = contactParticipant.id;
        } else if (fromAddressPlatformObject.type === 'emailIdentity') {
          // we need to get the first person/group in the routing rule and add them to the convo
          const emailIdentityParticipant =
            await db.query.emailIdentities.findFirst({
              where: and(
                eq(emailIdentities.orgId, orgId),
                eq(emailIdentities.id, fromAddressPlatformObject.id)
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
          const firstDestination =
            emailIdentityParticipant.routingRules.destinations[0];
          let convoParticipantFromAddressIdentity;
          if (firstDestination.orgMemberId) {
            convoParticipantFromAddressIdentity =
              await db.query.convoParticipants.findFirst({
                where: and(
                  eq(convoParticipants.orgId, orgId),
                  eq(convoParticipants.convoId, convoId),
                  eq(
                    convoParticipants.orgMemberId,
                    firstDestination.orgMemberId
                  )
                ),
                columns: {
                  id: true
                }
              });
          } else if (firstDestination.groupId) {
            convoParticipantFromAddressIdentity =
              await db.query.convoParticipants.findFirst({
                where: and(
                  eq(convoParticipants.orgId, orgId),
                  eq(convoParticipants.convoId, convoId),
                  eq(convoParticipants.userGroupId, firstDestination.groupId)
                ),
                columns: {
                  id: true
                }
              });
          }
          fromAddressParticipantId = convoParticipantFromAddressIdentity.id;
        }
      }
    }

    console.log({ fromAddressParticipantId });

    // append the message to the existing convo
    const convoEntryMetadata: ConvoEntryMetadata = {
      email: {
        messageId: messageId,
        to: messageToPlatformObject.map((a) => {
          return {
            id: a.id,
            type: a.type
          };
        }),
        from: messageFromPlatformObject.map((a) => {
          return {
            id: a.id,
            type: a.type
          };
        }),
        cc:
          messageCcPlatformObject.map((a) => {
            return {
              id: a.id,
              type: a.type
            };
          }) || [],
        postalMessages: [
          {
            id: payloadPostalEmailId,
            postalMessageId: messageId,
            recipient: payloadEmailTo,
            token: null
          }
        ],
        emailHeaders: JSON.stringify(parsedEmail.headers)
      }
    };
    console.log(
      'parsing email for tiptap',
      parsedEmailMessage.parsedMessageHtml
    );
    const convoEntryBody = tiptapHtml.generateJSON(
      parsedEmailMessage.parsedMessageHtml,
      tipTapExtensions
    );
    const convoEntryBodyPlainText = tiptapCore.generateText(
      convoEntryBody,
      tipTapExtensions
    );
    console.log({ tiptap: JSON.stringify(convoEntryBody) });
    const insertNewConvoEntry = await db.insert(convoEntries).values({
      orgId: orgId,
      publicId: nanoId(),
      convoId: convoId,
      visibility: 'all_participants',
      type: 'message',
      metadata: convoEntryMetadata,
      author: fromAddressParticipantId,
      body: convoEntryBody,
      bodyPlainText: convoEntryBodyPlainText,
      replyToId: existingMessage.id,
      subjectId: existingMessage.subjectId
    });
    console.log({ insertNewConvoEntry });
    console.log('🔥 appended to existing convo', { existingMessage });

    //! END IF REPLY TO
  } else {
    // If no reply to header, then we assume this is a new convo
    console.log('🔥 is not a reply');
  }

  // send alerts

  // return { status: "I'm Alive 🏝️" };
  console.timeEnd('⌛ Timer');
});
