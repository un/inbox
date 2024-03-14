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
  convoSubjects,
  convos,
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
  console.time('⌛ get mailserver from params');
  const [orgIdStr, mailserverId] = event.context.params.mailServer.split('/');
  const orgId = Number(orgIdStr);
  console.timeEnd('⌛ get mailserver from params');

  //verify the mailserver actually exists
  console.time('⌛ get mailserver from event');
  const mailServer = await db.query.postalServers.findFirst({
    where: eq(postalServers.publicId, mailserverId),
    columns: {
      id: true,
      orgId: true
    }
  });
  console.timeEnd('⌛ get mailserver from event');

  // read and decode the email payload
  console.time('⌛ read body');
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
    console.timeEnd('⌛ read body');
    console.timeEnd('⌛ Timer');
    return;
  }
  console.timeEnd('⌛ read body');

  // prelimary checks
  if (!mailServer || +mailServer.orgId !== orgId) {
    console.error('⛔ mailserver not found or does not belong to this org', {
      orgId,
      mailserverId,
      payloadPostalEmailId
    });
    console.timeEnd('⌛ Timer');
    return;
  }

  //* parse the email payload
  console.time('⌛ parse email payload');
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
  console.timeEnd('⌛ parse email payload');

  // Check if we have already processed this incoming email by checking the message ID + orgID
  console.time('⌛ check if messageId Exists');
  const alreadyProcessedMessageWithThisId =
    await db.query.convoEntries.findFirst({
      where: and(
        eq(convoEntries.orgId, orgId),
        eq(convoEntries.emailMessageId, messageId)
      ),
      columns: {
        id: true
      }
    });

  if (alreadyProcessedMessageWithThisId) {
    console.timeEnd('⌛ check if messageId Exists');
    console.timeEnd('⌛ Timer');
    return;
  }
  console.timeEnd('⌛ check if messageId Exists');

  // parse the email HTML content and clean it up
  console.time('⌛ parse email contents');
  const parsedEmailMessage = await parseMessage(messageBodyHtml, {
    cleanQuotations: true,
    cleanSignatures: true,
    enhanceLinks: true,
    autolink: true,
    noRemoteContent: true,
    cleanStyles: true
  });
  console.timeEnd('⌛ parse email contents');

  //* get the contact and emailIdentityIds for the message
  console.time('⌛ parse and create contacts if they dont exist');
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
  console.timeEnd('⌛ parse and create contacts if they dont exist');

  console.time('⌛ update contact signature');
  // check the from contact and update their signature if it is null
  if (messageFromPlatformObject[0].type === 'contact') {
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.orgId, orgId),
        eq(contacts.id, messageFromPlatformObject[0].id)
      ),
      columns: {
        id: true,
        signaturePlainText: true
      }
    });
    if (!contact.signaturePlainText) {
      await db
        .update(contacts)
        .set({
          signaturePlainText: parsedEmailMessage.foundSignaturePlainText,
          signatureHtml: parsedEmailMessage.foundSignatureHtml
        })
        .where(eq(contacts.id, contact.id));
    }
  }
  console.timeEnd('⌛ update contact signature');

  const messageAddressIds = [
    ...(Array.isArray(messageToPlatformObject) ? messageToPlatformObject : []),
    ...(Array.isArray(messageFromPlatformObject)
      ? messageFromPlatformObject
      : []),
    ...(Array.isArray(messageCcPlatformObject) ? messageCcPlatformObject : [])
  ];

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
    console.timeEnd('⌛ Timer');
    return;
  }

  // get the routing rule destinations for each of the email addresses, then get the users and contacts within those routing rules

  const routingRuleUserGroupIds: number[] = [];
  const routingRuleOrgMemberIds: number[] = [];
  console.time('⌛ get email identities');
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
  console.timeEnd('⌛ get email identities');

  console.time('⌛ Start to process convo');
  //* start to process the conversation
  let hasReplyToButIsNewConvo: boolean | null = null;
  let convoId: number | null = null;
  let replyToId: number | null = null;
  let subjectId: number | null = null;

  type ConvoParticipantInsertDbType = InferInsertModel<
    typeof convoParticipants
  >;
  let fromAddressParticipantId: number | null = null;
  const fromAddressPlatformObject = messageFromPlatformObject.find(
    (a) => a.ref === 'from'
  );
  const convoParticipantsToAdd: ConvoParticipantInsertDbType[] = [];

  // if the email has a reply to header, then we need to check if a message exists in the system with that reply to id
  // - if yes, then we append the message to that existing convo
  // - if no, then we assume this is a new convo and handle it at such
  if (inReplyToEmailId) {
    console.log('🔥 reply to email id', inReplyToEmailId);
    console.time('⌛ get existing message query');
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

    if (existingMessage) {
      hasReplyToButIsNewConvo = false;
      convoId = existingMessage.convoId;
      replyToId = existingMessage.id;

      // check if the subject is the same as existing, if not, add a new subject to the convo
      if (subject !== existingMessage.subject.subject) {
        const newSubject = await db.insert(convos).values({
          orgId: orgId,
          publicId: nanoId(),
          lastUpdatedAt: new Date()
        });
        subjectId = +newSubject.insertId;
      } else {
        subjectId = existingMessage.subjectId;
      }

      //check if the contact id is already in the convo participants
      if (fromAddressPlatformObject.type === 'contact') {
        const contactAlreadyInConvo = existingMessage.convo.participants.find(
          (p) => p.contactId === fromAddressPlatformObject.id
        );
        if (contactAlreadyInConvo) {
          fromAddressParticipantId = contactAlreadyInConvo.id;
        }
        // if not in the convo, we'll set their id later
      }

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

      // - if not, then add them to the convo participants to add array
      if (missingContacts.length) {
        convoParticipantsToAdd.push(
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
        convoParticipantsToAdd.push(
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
        convoParticipantsToAdd.push(
          ...missingUserGroups.map((userGroupId) => ({
            convoId: convoId,
            userGroupId: userGroupId,
            orgId: orgId,
            publicId: nanoId(),
            role: 'contributor' as const
          }))
        );
      }
      console.timeEnd('⌛ get existing message query');
    } else {
      // if there is a reply to header but we cant find the conversation, we handle this like its a new convo
      hasReplyToButIsNewConvo = true;
    }

    //! END OF IF REPLYID BLOCK
  }

  // create a new convo with new participants
  if (!inReplyToEmailId || hasReplyToButIsNewConvo) {
    console.time('⌛ Handle new convo');
    console.log('🔥 is a new convo');
    const newConvoInsert = await db.insert(convos).values({
      orgId: orgId,
      publicId: nanoId(),
      lastUpdatedAt: new Date()
    });
    const newConvoSubjectInsert = await db.insert(convoSubjects).values({
      orgId: orgId,
      convoId: +newConvoInsert.insertId,
      publicId: nanoId(),
      subject: subject
    });

    convoId = +newConvoInsert.insertId;
    subjectId = +newConvoSubjectInsert.insertId;

    // add the new participants to the convo
    if (contactIds.length) {
      convoParticipantsToAdd.push(
        ...contactIds.map((contactId) => ({
          convoId: convoId,
          contactId: contactId,
          orgId: orgId,
          publicId: nanoId(),
          role: 'contributor' as const
        }))
      );
    }
    if (routingRuleOrgMemberIds.length) {
      convoParticipantsToAdd.push(
        ...routingRuleOrgMemberIds.map((orgMemberId) => ({
          convoId: convoId,
          orgMemberId: orgMemberId,
          orgId: orgId,
          publicId: nanoId(),
          role: 'contributor' as const
        }))
      );
    }
    if (routingRuleUserGroupIds.length) {
      convoParticipantsToAdd.push(
        ...routingRuleUserGroupIds.map((userGroupId) => ({
          convoId: convoId,
          userGroupId: userGroupId,
          orgId: orgId,
          publicId: nanoId(),
          role: 'contributor' as const
        }))
      );
    }
  }
  console.timeEnd('⌛ Handle new convo');

  //* start to handle creating the message in the convo

  console.time('⌛ Insert convo participants');
  if (convoParticipantsToAdd.length) {
    await db.insert(convoParticipants).values(convoParticipantsToAdd);
  }
  console.timeEnd('⌛ Insert convo participants');

  console.time('⌛ Do from participant stuffs');
  if (!fromAddressParticipantId) {
    if (fromAddressPlatformObject.type === 'contact') {
      const contactParticipant = await db.query.convoParticipants.findFirst({
        where: and(
          eq(convoParticipants.orgId, orgId),
          eq(convoParticipants.convoId, convoId),
          eq(convoParticipants.contactId, fromAddressPlatformObject.id)
        ),
        columns: {
          id: true
        }
      });
      fromAddressParticipantId = contactParticipant.id;
    } else if (fromAddressPlatformObject.type === 'emailIdentity') {
      // we need to get the first person/group in the routing rule and add them to the convo
      const emailIdentityParticipant = await db.query.emailIdentities.findFirst(
        {
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
        }
      );
      const firstDestination =
        emailIdentityParticipant.routingRules.destinations[0];
      let convoParticipantFromAddressIdentity;
      if (firstDestination.orgMemberId) {
        convoParticipantFromAddressIdentity =
          await db.query.convoParticipants.findFirst({
            where: and(
              eq(convoParticipants.orgId, orgId),
              eq(convoParticipants.convoId, convoId),
              eq(convoParticipants.orgMemberId, firstDestination.orgMemberId)
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
  console.timeEnd('⌛ Do from participant stuffs');
  console.log({ fromAddressParticipantId });

  console.time('⌛ Create convo data stuff for input');
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

  console.log('parsing email for tiptap', parsedEmailMessage.parsedMessageHtml);
  const convoEntryBody = tiptapHtml.generateJSON(
    parsedEmailMessage.parsedMessageHtml,
    tipTapExtensions
  );
  const convoEntryBodyPlainText = tiptapCore.generateText(
    convoEntryBody,
    tipTapExtensions
  );
  console.timeEnd('⌛ Create convo data stuff for input');

  console.time('⌛ Insert new convo');
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
    replyToId: replyToId,
    subjectId: subjectId
  });
  console.timeEnd('⌛ Insert new convo');
  console.log({ insertNewConvoEntry });
  console.timeEnd('⌛ Start to process convo');

  // send alerts

  // return { status: "I'm Alive 🏝️" };
  console.timeEnd('⌛ Timer');
});
