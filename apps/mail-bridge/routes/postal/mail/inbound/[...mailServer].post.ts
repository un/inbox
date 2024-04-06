import { db } from '@u22n/database';
import { simpleParser, type EmailAddress } from 'mailparser';
// @ts-expect-error, not typed yet
import { authenticate } from 'mailauth';
import { and, eq, inArray } from '@u22n/database/orm';
import type { InferInsertModel } from '@u22n/database/orm';
import {
  type ConvoEntryMetadata,
  contacts,
  convoAttachments,
  convoEntries,
  convoEntryReplies,
  convoParticipants,
  convoSubjects,
  convos,
  emailIdentities,
  postalServers,
  convoEntryRawHtmlEmails
} from '@u22n/database/schema';
import { parseMessage } from '@u22n/mailtools';
import type {
  MessageParseAddressPlatformObject,
  postalEmailPayload
} from '../../../../types';
import { typeIdGenerator, validateTypeId } from '@u22n/utils';
import { tiptapCore, tiptapHtml } from '@u22n/tiptap';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import {
  eventHandler,
  sendNoContent,
  readBody,
  parseAddressIds,
  useRuntimeConfig
} from '#imports';
import { sendRealtimeNotification } from '../../../../utils/realtime';

// TODO!: remove all `|| <default>` and `<nullish>?.` shortcuts in favour of proper error handling

/**
 * used for all incoming mail from Postal
 */

export default eventHandler(async (event) => {
  sendNoContent(event, 200);

  // read and decode the email payload
  const {
    id: payloadPostalEmailId,
    rcpt_to: payloadEmailTo,
    // mail_from: payloadEmailFrom,
    message: payloadEmailB64
  }: postalEmailPayload = await readBody(event);
  if (typeof payloadEmailB64 !== 'string') {
    console.error('⛔ no email payload, skipping processing', {
      payloadPostalEmailId
    });
    return;
  }

  let orgId: number = 0;
  let orgPublicId: string | null = null;
  let forwardedEmailAddress: string | null = null;
  const [orgIdStr, mailserverId] = event.context.params!.mailServer!.split('/');
  if (!orgIdStr || !mailserverId) {
    console.error('⛔ no orgId or mailserverId found', {
      payloadPostalEmailId
    });
    return;
  }

  if (orgIdStr === '0' && mailserverId === 'root') {
    // handle for root emails
    // get the email identity for the root email
    const [rootEmailUsername, rootEmailDomain] = payloadEmailTo.split('@');
    if (!rootEmailUsername || !rootEmailDomain) {
      console.error('⛔ invalid root email username or domain', {
        payloadPostalEmailId
      });
      return;
    }
    const rootEmailIdentity = await db.query.emailIdentities.findFirst({
      where: and(
        eq(emailIdentities.username, rootEmailUsername),
        eq(emailIdentities.domainName, rootEmailDomain)
      ),
      columns: {
        id: true,
        orgId: true
      },
      with: {
        org: {
          columns: {
            publicId: true
          }
        }
      }
    });
    if (!rootEmailIdentity) {
      console.error('⛔ no email identity found for root email', {
        payloadPostalEmailId
      });

      return;
    }
    orgId = rootEmailIdentity.orgId;
    orgPublicId = rootEmailIdentity.org.publicId;
  } else if (orgIdStr === '0' && mailserverId === 'fwd') {
    // handle for fwd emails
    // get the email identity for the root email
    const fwdEmailAddress = payloadEmailTo;

    if (!fwdEmailAddress) {
      console.error('⛔ invalid forwarding email address', {
        payloadPostalEmailId
      });
      return;
    }
    const fwdEmailIdentity = await db.query.emailIdentities.findFirst({
      where: eq(emailIdentities.forwardingAddress, fwdEmailAddress),
      columns: {
        id: true,
        username: true,
        domainName: true,
        orgId: true
      },
      with: {
        org: {
          columns: {
            publicId: true
          }
        }
      }
    });
    if (!fwdEmailIdentity) {
      console.error('⛔ no email identity found for fwd email', {
        payloadPostalEmailId
      });

      return;
    }
    orgId = fwdEmailIdentity.orgId;
    orgPublicId = fwdEmailIdentity.org.publicId;
    forwardedEmailAddress = fwdEmailAddress;
  } else {
    orgId = Number(orgIdStr);

    // handle for org emails
    if (!validateTypeId('postalServers', mailserverId)) {
      console.error('⛔ invalid mailserver id', {
        mailserverId,
        payloadPostalEmailId
      });
      return;
    }
    //verify the mailserver actually exists
    const mailServer = await db.query.postalServers.findFirst({
      where: eq(postalServers.publicId, mailserverId),
      columns: {
        id: true,
        orgId: true
      },
      with: {
        org: {
          columns: {
            publicId: true
          }
        }
      }
    });
    // preliminary checks
    if (!mailServer || +mailServer.orgId !== orgId) {
      console.error('⛔ mailserver not found or does not belong to this org', {
        orgId,
        mailserverId,
        payloadPostalEmailId
      });

      return;
    }
    orgId = Number(mailServer.orgId);
    orgPublicId = mailServer.org.publicId;
  }

  if (orgId === 0 || !orgPublicId) {
    console.error('⛔ orgId or orgPublicId not found', {
      payloadPostalEmailId
    });
    return;
  }

  //* parse the email payload
  const payloadEmail = Buffer.from(payloadEmailB64, 'base64').toString('utf-8');
  const parsedEmail = await simpleParser(payloadEmail);

  //! verify email auth (DKIM, SPF, etc.) - unhandled right now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const auth = await authenticate(payloadEmail, {
    trustReceived: true
  });

  if (!parsedEmail.from) {
    console.error('⛔ no from address found in the email', {
      payloadPostalEmailId
    });
    return;
  }

  if (!parsedEmail.to) {
    console.error('⛔ no to address found in the email', {
      payloadPostalEmailId
    });
    return;
  }

  // Extract key email properties
  if (
    !parsedEmail.from ||
    !parsedEmail.to ||
    !parsedEmail.subject ||
    !parsedEmail.messageId
  ) {
    console.error('⛔ missing email attributes', {
      payloadPostalEmailId
    });
    return;
  }
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
    parsedEmail.subject?.replace(/^(RE:|FW:)\s*/i, '').trim() || '';
  const messageId = parsedEmail.messageId?.replace(/^<|>$/g, '') || '';
  const messageBodyHtml = parsedEmail.html
    ? (parsedEmail.html as string).replace(/\n/g, '')
    : parsedEmail.textAsHtml
      ? (parsedEmail.textAsHtml as string).replace(/\n/g, '')
      : '';
  const attachments = parsedEmail.attachments || [];
  const emailHeaders = Object.fromEntries(parsedEmail.headers);
  if (forwardedEmailAddress) {
    const forwardedForHeader = emailHeaders['x-forwarded-for'] as string;
    const forwardedToAddress =
      forwardedForHeader?.split(' ')[0]?.trim() || null;

    //find if the forwardedToAddress exists in the messageFrom, messageTo or messageCc arrays, if it does, push the forwardingAddress to the respective array so we can look it up in case the to address is not a registered identity
    if (forwardedToAddress) {
      const forwardingAddressObject: EmailAddress = {
        address: forwardedEmailAddress,
        name: ''
      };

      if (messageTo.some((email) => email.address === forwardedToAddress)) {
        messageTo.push(forwardingAddressObject);
      }
      if (messageFrom.some((email) => email.address === forwardedToAddress)) {
        messageFrom.push(forwardingAddressObject);
      }
      if (messageCc?.some((email) => email.address === forwardedToAddress)) {
        messageCc.push(forwardingAddressObject);
      }
    }
  }

  // Check if we have already processed this incoming email by checking the message ID + orgID
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
    return;
  }

  // parse the email HTML content and clean it up
  const parsedEmailMessage = await parseMessage(messageBodyHtml, {
    cleanQuotations: true,
    cleanSignatures: true,
    enhanceLinks: true,
    autolink: true,
    noRemoteContent: true,
    cleanStyles: true
  });

  //* get the contact and emailIdentityIds for the message
  const [
    messageToPlatformObject,
    messageFromPlatformObject,
    messageCcPlatformObject
  ]: [
    MessageParseAddressPlatformObject[],
    MessageParseAddressPlatformObject[],
    MessageParseAddressPlatformObject[] | []
  ] = await Promise.allSettled([
    parseAddressIds({
      addresses: messageTo,
      addressType: 'to',
      orgId: orgId || 0
    }),
    parseAddressIds({
      addresses: messageFrom,
      addressType: 'from',
      orgId: orgId || 0
    }),
    messageCc
      ? parseAddressIds({ addresses: messageCc, addressType: 'cc', orgId })
      : Promise.resolve([])
  ]).then((res) => {
    return res.map((r) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      console.error('⛔ error parsing email addresses', r.reason);
      return [];
    }) as [
      MessageParseAddressPlatformObject[],
      MessageParseAddressPlatformObject[],
      MessageParseAddressPlatformObject[] | []
    ];
  });

  if (
    !messageToPlatformObject ||
    !messageToPlatformObject[0] ||
    !messageFromPlatformObject ||
    !messageFromPlatformObject[0]
  ) {
    console.error(
      '⛔ no messageToPlatformObject or messageFromPlatformObject found',
      {
        payloadPostalEmailId
      }
    );
    return;
  }

  // check the from contact and update their signature if it is null
  if (messageFromPlatformObject[0]?.type === 'contact') {
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.orgId, orgId),
        eq(contacts.id, messageFromPlatformObject[0]?.id || 0)
      ),
      columns: {
        id: true,
        signaturePlainText: true
      }
    });
    if (!contact) {
      console.error('⛔ no contact found for from address', {
        payloadPostalEmailId
      });
      return;
    }
    if (!contact.signaturePlainText) {
      await db
        .update(contacts)
        .set({
          signaturePlainText: parsedEmailMessage.foundSignaturePlainText,
          signatureHtml: parsedEmailMessage.foundSignatureHtml
        })
        .where(eq(contacts.id, contact?.id || 0));
    }
  }

  const messageAddressIds = [
    ...(Array.isArray(messageToPlatformObject) ? messageToPlatformObject : []),
    ...(Array.isArray(messageFromPlatformObject)
      ? messageFromPlatformObject
      : []),
    ...(Array.isArray(messageCcPlatformObject) ? messageCcPlatformObject : [])
  ];

  // extract the IDs of all the entries in messageAddressIds where the type = 'emailIdentity'
  const emailIdentityIds = Array.from(
    new Set(
      messageAddressIds
        .filter((a) => a.type === 'emailIdentity')
        .map((a) => a.id)
    )
  );
  const contactIds = Array.from(
    new Set(
      messageAddressIds.filter((a) => a.type === 'contact').map((a) => a.id)
    )
  );

  // if theres no email identity ids, then we assume that this email has no destination, so we need to send the bounce message
  if (!emailIdentityIds.length) {
    // !FIX SEND BOUNCE MESSAGE
    console.error('⛔ no email identity ids found', { messageAddressIds });

    return;
  }

  // get the routing rule destinations for each of the email addresses, then get the users and contacts within those routing rules

  const routingRuleGroupIds: number[] = [];
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
        routingRuleGroupIds.push(destination.groupId);
      } else if (destination.orgMemberId) {
        routingRuleOrgMemberIds.push(destination.orgMemberId);
      }
    });
  });

  //* start to process the conversation
  let hasReplyToButIsNewConvo: boolean | null = null;
  let convoId: number = 0;
  let replyToId: number | null = null;
  let subjectId: number | null = null;

  type ConvoParticipantInsertDbType = InferInsertModel<
    typeof convoParticipants
  >;
  let fromAddressParticipantId: number | null = null;
  const fromAddressPlatformObject = messageFromPlatformObject.find(
    (a) => a.ref === 'from'
  );
  if (!fromAddressPlatformObject) {
    console.error('⛔ no from address platform object found', {
      payloadPostalEmailId
    });
    return;
  }
  const convoParticipantsToAdd: ConvoParticipantInsertDbType[] = [];

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
                groupId: true,
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

      if (!existingMessage.convoId || convoId === 0) {
        console.error('⛔ no convoId found for existing message', {
          payloadPostalEmailId
        });
        return;
      }
      if (!existingMessage.subject) {
        existingMessage.subject = { id: 0, subject: 'No Subject' };
      }
      // check if the subject is the same as existing, if not, add a new subject to the convo
      if (subject !== existingMessage.subject?.subject) {
        const newSubject = await db.insert(convos).values({
          orgId: orgId,
          publicId: typeIdGenerator('convos'),
          lastUpdatedAt: new Date()
        });
        subjectId = +newSubject.insertId;
      } else {
        subjectId = existingMessage.subjectId;
      }

      //check if the contact id is already in the convo participants
      if (fromAddressPlatformObject?.type === 'contact') {
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
      const existingConvoParticipantsgroupIds =
        existingMessage.convo.participants.map((p) => p.groupId);
      const missingUserGroups = routingRuleGroupIds.filter(
        (c) => !existingConvoParticipantsgroupIds.includes(c)
      );

      // - if not, then add them to the convo participants to add array
      if (missingContacts.length) {
        convoParticipantsToAdd.push(
          ...missingContacts.map((contactId) => ({
            convoId: convoId || 0,
            contactId: contactId || 0,
            orgId: orgId || 0,
            publicId: typeIdGenerator('convoParticipants'),
            role: 'contributor' as const
          }))
        );
      }
      if (missingOrgMembers.length) {
        convoParticipantsToAdd.push(
          ...missingOrgMembers.map((orgMemberId) => ({
            convoId: convoId || 0,
            orgMemberId: orgMemberId || 0,
            orgId: orgId || 0,
            publicId: typeIdGenerator('convoParticipants'),
            role: 'contributor' as const
          }))
        );
      }
      if (missingUserGroups.length) {
        convoParticipantsToAdd.push(
          ...missingUserGroups.map((groupId) => ({
            convoId: convoId || 0,
            groupId: groupId || 0,
            orgId: orgId || 0,
            publicId: typeIdGenerator('convoParticipants'),
            role: 'contributor' as const
          }))
        );
      }
    } else {
      // if there is a reply to header but we cant find the conversation, we handle this like its a new convo
      hasReplyToButIsNewConvo = true;
    }

    // END OF IF REPLYID BLOCK
  }

  // create a new convo with new participants
  if (!inReplyToEmailId || hasReplyToButIsNewConvo) {
    const newConvoInsert = await db.insert(convos).values({
      orgId: orgId,
      publicId: typeIdGenerator('convos'),
      lastUpdatedAt: new Date()
    });
    const newConvoSubjectInsert = await db.insert(convoSubjects).values({
      orgId: orgId,
      convoId: +newConvoInsert.insertId,
      publicId: typeIdGenerator('convoSubjects'),
      subject: subject
    });

    convoId = +newConvoInsert.insertId;
    subjectId = +newConvoSubjectInsert.insertId;

    // add the new participants to the convo
    if (contactIds.length) {
      convoParticipantsToAdd.push(
        ...contactIds.map((contactId) => ({
          convoId: convoId || 0,
          contactId: contactId || 0,
          orgId: orgId || 0,
          publicId: typeIdGenerator('convoParticipants'),
          role: 'contributor' as const
        }))
      );
    }
    if (routingRuleOrgMemberIds.length) {
      convoParticipantsToAdd.push(
        ...routingRuleOrgMemberIds.map((orgMemberId) => ({
          convoId: convoId || 0,
          orgMemberId: orgMemberId || 0,
          orgId: orgId || 0,
          publicId: typeIdGenerator('convoParticipants'),
          role: 'contributor' as const
        }))
      );
    }
    if (routingRuleGroupIds.length) {
      convoParticipantsToAdd.push(
        ...routingRuleGroupIds.map((groupId) => ({
          convoId: convoId || 0,
          groupId: groupId || 0,
          orgId: orgId || 0,
          publicId: typeIdGenerator('convoParticipants'),
          role: 'contributor' as const
        }))
      );
    }
  }

  //* start to handle creating the message in the convo

  if (convoParticipantsToAdd.length) {
    await db.insert(convoParticipants).values(convoParticipantsToAdd);
  }

  if (!fromAddressParticipantId) {
    if (fromAddressPlatformObject?.type === 'contact') {
      const contactParticipant = await db.query.convoParticipants.findFirst({
        where: and(
          eq(convoParticipants.orgId, orgId),
          eq(convoParticipants.convoId, convoId || 0),
          eq(convoParticipants.contactId, fromAddressPlatformObject?.id)
        ),
        columns: {
          id: true
        }
      });
      // @ts-expect-error we check and define earlier up
      fromAddressParticipantId = contactParticipant.id;
    } else if (fromAddressPlatformObject.type === 'emailIdentity') {
      // we need to get the first person/group in the routing rule and add them to the convo
      const emailIdentityParticipant = await db.query.emailIdentities.findFirst(
        {
          where: and(
            eq(emailIdentities.orgId, orgId),
            eq(emailIdentities.id, fromAddressPlatformObject?.id)
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
        // @ts-expect-error we check and define earlier up
        emailIdentityParticipant.routingRules.destinations[0];
      let convoParticipantFromAddressIdentity;
      // @ts-expect-error we check and define earlier up
      if (firstDestination.orgMemberId) {
        convoParticipantFromAddressIdentity =
          await db.query.convoParticipants.findFirst({
            where: and(
              eq(convoParticipants.orgId, orgId),
              eq(convoParticipants.convoId, convoId),
              // @ts-expect-error we check and define earlier up
              eq(convoParticipants.orgMemberId, firstDestination.orgMemberId)
            ),
            columns: {
              id: true
            }
          });
        // @ts-expect-error we check and define earlier up
      } else if (firstDestination.groupId) {
        convoParticipantFromAddressIdentity =
          await db.query.convoParticipants.findFirst({
            where: and(
              eq(convoParticipants.orgId, orgId),
              eq(convoParticipants.convoId, convoId || 0),
              eq(convoParticipants.groupId, firstDestination!.groupId)
            ),
            columns: {
              id: true
            }
          });
      }
      // @ts-expect-error we check and define earlier up
      fromAddressParticipantId = convoParticipantFromAddressIdentity.id;
    }
  }

  // append the message to the existing convo
  const convoEntryMetadata: ConvoEntryMetadata = {
    email: {
      messageId: messageId,
      to: messageToPlatformObject.map((a) => {
        return {
          id: a.id,
          type: a.type,
          publicId: a.publicId,
          email: a.email
        };
      }),
      from: messageFromPlatformObject.map((a) => {
        return {
          id: a.id,
          type: a.type,
          publicId: a.publicId,
          email: a.email
        };
      }),
      cc:
        messageCcPlatformObject.map((a) => {
          return {
            id: a.id,
            type: a.type,
            publicId: a.publicId,
            email: a.email
          };
        }) || [],
      postalMessages: [
        {
          id: payloadPostalEmailId,
          postalMessageId: messageId,
          recipient: payloadEmailTo,
          token: ''
        }
      ],
      emailHeaders: JSON.stringify(parsedEmail.headers)
    }
  };

  const convoEntryBody = tiptapHtml.generateJSON(
    parsedEmailMessage.parsedMessageHtml,
    tipTapExtensions
  );
  const convoEntryBodyPlainText = tiptapCore.generateText(
    convoEntryBody,
    tipTapExtensions
  );
  const insertNewConvoEntry = await db.insert(convoEntries).values({
    orgId: orgId,
    publicId: typeIdGenerator('convoEntries'),
    convoId: convoId!,
    visibility: 'all_participants',
    type: 'message',
    metadata: convoEntryMetadata,
    author: fromAddressParticipantId!,
    body: convoEntryBody,
    bodyPlainText: convoEntryBodyPlainText,
    replyToId: replyToId,
    subjectId: subjectId
  });

  if (replyToId) {
    await db.insert(convoEntryReplies).values({
      entrySourceId: replyToId,
      entryReplyId: +insertNewConvoEntry.insertId,
      orgId: orgId
    });
  }

  // handle attachments
  interface UploadAndAttachAttachmentInput {
    orgId: number;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    fileSize: number;
    convoId: number;
    convoEntryId: number;
    convoParticipantId: number;
  }
  async function uploadAndAttachAttachment(
    input: UploadAndAttachAttachmentInput
  ) {
    type PreSignedData = {
      publicId: string;
      signedUrl: string;
    };

    // TODO: remove this once fixed
    // eslint-disable-next-line no-console
    console.log(
      'Presign Url:',
      `${useRuntimeConfig().storage.url}/api/attachments/internalPresign`,
      '  ',
      'Key:',
      useRuntimeConfig().storage.key
    );

    const preUpload: PreSignedData = await fetch(
      `${useRuntimeConfig().storage.url}/api/attachments/internalPresign`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: useRuntimeConfig().storage.key
        },
        body: JSON.stringify({
          orgPublicId: orgPublicId,
          filename: input.fileName
        }),
        credentials: 'include'
      }
    ).then((res: Response) => res.json() as Promise<PreSignedData>);
    if (!preUpload || !preUpload.publicId || !preUpload.signedUrl) {
      throw new Error('Missing attachmentPublicId or presignedUrl');
    }
    const attachmentPublicId = preUpload.publicId;
    const presignedUrl = preUpload.signedUrl;

    if (!validateTypeId('convoAttachments', attachmentPublicId)) {
      throw new Error('Invalid attachmentPublicId');
    }

    try {
      await $fetch(presignedUrl, {
        method: 'put',
        body: input.fileContent,
        headers: {
          'Content-Type': input.fileType
        }
      });
    } catch (error) {
      console.error('Error uploading file to presigned URL:', error);
      throw error; // Rethrow to handle it in the outer catch block
    }

    await db.insert(convoAttachments).values({
      convoId: input.convoId,
      convoEntryId: input.convoEntryId,
      convoParticipantId: input.convoParticipantId,
      orgId: input.orgId,
      publicId: attachmentPublicId,
      fileName: input.fileName,
      type: input.fileType,
      size: input.fileSize
    });
  }

  if (attachments.length) {
    const attachmentPromises = await Promise.allSettled(
      attachments.map((attachment) => {
        return uploadAndAttachAttachment({
          orgId: orgId,
          fileName: attachment.filename || 'No Filename',
          fileType: attachment.contentType,
          fileContent: attachment.content,
          convoId: convoId || 0,
          convoEntryId: +insertNewConvoEntry.insertId,
          convoParticipantId: fromAddressParticipantId || 0,
          fileSize: attachment.size
        });
      })
    );
    attachmentPromises.forEach((promise) => {
      if (promise.status === 'rejected') {
        console.error('Error uploading attachment:', promise.reason);
      }
    });
  }

  await db.insert(convoEntryRawHtmlEmails).values({
    orgId: orgId,
    entryId: Number(insertNewConvoEntry.insertId),
    html: parsedEmail.html || parsedEmail.textAsHtml || '',
    headers: Object.fromEntries(parsedEmail.headers),
    wipeDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28) // 28 days
  });

  await sendRealtimeNotification({
    newConvo: !inReplyToEmailId || hasReplyToButIsNewConvo || false,
    convoId: convoId,
    convoEntryId: +insertNewConvoEntry.insertId
  });

  return;
});
