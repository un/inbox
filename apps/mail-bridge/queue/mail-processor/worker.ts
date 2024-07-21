import {
  contacts,
  convoAttachments,
  convoEntries,
  convoEntryRawHtmlEmails,
  convoEntryReplies,
  convoParticipants,
  convoSubjects,
  convos,
  emailIdentities,
  orgs,
  postalServers,
  type ConvoEntryMetadata
} from '@u22n/database/schema';
import {
  typeIdGenerator,
  validateTypeId,
  type TypeId
} from '@u22n/utils/typeid';
import type { MailParamsSchema, PostalMessageSchema } from './schemas';
import { sendRealtimeNotification } from '../../utils/realtime';
import { parseAddressIds } from '../../utils/contactParsing';
import { simpleParser, type EmailAddress } from 'mailparser';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { eq, and, inArray } from '@u22n/database/orm';
import { tiptapCore, tiptapHtml } from '@u22n/tiptap';
import { getTracer } from '@u22n/otel/helpers';
import { parseMessage } from '@u22n/mailtools';
import { discord } from '@u22n/utils/discord';
import { sanitize } from '../../utils/purify';
import { logger } from '@u22n/otel/logger';
import { db } from '@u22n/database';
import { env } from '../../env';
import { Worker } from 'bullmq';
import mime from 'mime';

const { host, username, password, port } = new URL(
  env.DB_REDIS_CONNECTION_STRING
);

const tracer = getTracer('mail-bridge/queue/mail-processor');

export const worker = new Worker<
  {
    rawMessage: PostalMessageSchema;
    params: MailParamsSchema;
  },
  void
>(
  'mail-processor',
  (job) =>
    tracer.startActiveSpan('Mail Processor', async (span) => {
      try {
        span?.setAttributes({
          'job.id': job.id,
          'job.data': JSON.stringify(job.data)
        });

        const { rawMessage, params } = job.data;
        const { id, rcpt_to, message, base64 } = rawMessage;

        const { orgId, orgPublicId, forwardedEmailAddress } =
          await resolveOrgAndMailserver({
            rcpt_to,
            ...params
          });

        span?.addEvent('mail-processor.resolved_org_mailserver', {
          orgId,
          orgPublicId,
          forwardedEmailAddress: forwardedEmailAddress ?? '<null>'
        });

        const payloadEmail = base64
          ? Buffer.from(message, 'base64').toString('utf-8')
          : message;

        const parsedEmail = await simpleParser(payloadEmail, {
          skipImageLinks: true
        });

        if (!parsedEmail.from)
          throw new Error('No from address found in the email');
        if (!parsedEmail.to)
          throw new Error('No to address found in the email');
        if (!parsedEmail.subject)
          throw new Error('No subject found in the email');
        if (!parsedEmail.messageId)
          throw new Error('No message ID found in the email');

        if (parsedEmail.from.value.length > 1) {
          logger.warn(
            'Multiple from addresses detected in a message, only using first email address'
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
          : [];

        const inReplyToEmailId = parsedEmail.inReplyTo
          ? parsedEmail.inReplyTo
              .split(/\s+/g) // split by whitespace
              .map((part) => part.replace(/^<|>$/g, '')) // remove < and > from the start and end of the string
              .filter((part) => !!part)[0] ?? null // remove empty strings and get the first element or null
          : null;

        const subject =
          parsedEmail.subject?.replace(/^(RE:|FW:)\s*/i, '').trim() || '';
        const messageId = parsedEmail.messageId?.replace(/^<|>$/g, '') || '';
        const messageBodyHtml = parsedEmail.html
          ? parsedEmail.html.replace(/\n/g, '')
          : parsedEmail.textAsHtml
            ? parsedEmail.textAsHtml.replace(/\n/g, '')
            : '';
        const attachments = parsedEmail.attachments || [];

        if (forwardedEmailAddress) {
          const forwardingAddressObject: EmailAddress = {
            address: forwardedEmailAddress,
            name: ''
          };
          messageCc.push(forwardingAddressObject);
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
          logger.warn('Message already processed');
          return;
        }

        // Get a full version of the email
        const fullParsedEmail = await parseMessage(messageBodyHtml, {
          autolink: false,
          cleanQuotations: false,
          cleanSignatures: false,
          enhanceLinks: false,
          cleanStyles: false,
          noRemoteContent: false
        });

        // Get a stripped down version of the email
        const strippedEmail = await parseMessage(messageBodyHtml, {
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
        ] = await Promise.all([
          parseAddressIds({
            addresses: messageTo,
            addressType: 'to',
            orgId
          }),
          parseAddressIds({
            addresses: messageFrom,
            addressType: 'from',
            orgId
          }),
          messageCc.length
            ? parseAddressIds({
                addresses: messageCc,
                addressType: 'cc',
                orgId
              })
            : Promise.resolve([])
        ]);

        if (!messageToPlatformObject?.[0] || !messageFromPlatformObject?.[0]) {
          span?.setAttributes({
            'message.toObject': JSON.stringify(messageToPlatformObject),
            'message.fromObject': JSON.stringify(messageFromPlatformObject)
          });
          throw new Error(
            'No messageToPlatformObject or messageFromPlatformObject found'
          );
        }

        // check the from contact and update their signature if it is null
        if (messageFromPlatformObject[0].type === 'contact') {
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
            throw new Error('No contact found for from address');
          }

          if (!contact.signaturePlainText) {
            await db
              .update(contacts)
              .set({
                signaturePlainText: strippedEmail.foundSignaturePlainText,
                signatureHtml: strippedEmail.foundSignatureHtml
              })
              .where(eq(contacts.id, contact.id));
          }
        }

        const messageAddressIds = [
          Array.isArray(messageToPlatformObject) ? messageToPlatformObject : [],
          Array.isArray(messageFromPlatformObject)
            ? messageFromPlatformObject
            : [],
          Array.isArray(messageCcPlatformObject) ? messageCcPlatformObject : []
        ].flat();

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
            messageAddressIds
              .filter((a) => a.type === 'contact')
              .map((a) => a.id)
          )
        );

        // if theres no email identity ids, then we assume that this email has no destination, so we need to send the bounce message
        if (!emailIdentityIds.length) {
          span?.setAttributes({
            'message.addressIds': JSON.stringify(messageAddressIds)
          });
          throw new Error('No email identity ids found');
        }

        // get the routing rule destinations for each of the email addresses, then get the users and contacts within those routing rules
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
                    teamId: true,
                    orgMemberId: true
                  }
                }
              }
            }
          }
        });

        const { routingRuleOrgMemberIds, routingRuleTeamIds } =
          emailIdentityResponse.reduce(
            (values, { routingRules }) => {
              for (const destination of routingRules.destinations) {
                if (destination.teamId) {
                  values.routingRuleTeamIds.push(destination.teamId);
                } else if (destination.orgMemberId) {
                  values.routingRuleOrgMemberIds.push(destination.orgMemberId);
                }
              }
              return values;
            },
            {
              routingRuleTeamIds: [] as number[],
              routingRuleOrgMemberIds: [] as number[]
            }
          );

        //* start to process the conversation
        let hasReplyToButIsNewConvo: boolean | null = null;
        let convoId = -1;
        let replyToId: number | null = null;
        let subjectId: number | null = null;

        type ConvoParticipantInsertDbType =
          typeof convoParticipants.$inferInsert;

        let fromAddressParticipantId: number | null = null;
        const fromAddressPlatformObject = messageFromPlatformObject.find(
          (a) => a.ref === 'from'
        );
        if (!fromAddressPlatformObject) {
          throw new Error('No from address platform object found');
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
                      teamId: true,
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
              throw new Error('No convoId found for existing message');
            }
            if (!existingMessage.subject) {
              existingMessage.subject = { id: 0, subject: 'No Subject' };
            }
            // check if the subject is the same as existing, if not, add a new subject to the convo
            if (subject !== existingMessage.subject?.subject) {
              const newSubject = await db.insert(convos).values({
                orgId,
                publicId: typeIdGenerator('convos'),
                lastUpdatedAt: new Date()
              });
              subjectId = Number(newSubject.insertId);
            } else if (existingMessage.subjectId) {
              subjectId = existingMessage.subjectId;
            }

            //check if the contact id is already in the convo participants
            if (fromAddressPlatformObject?.type === 'contact') {
              const contactAlreadyInConvo =
                existingMessage.convo.participants.find(
                  (p) => p.contactId === fromAddressPlatformObject.id
                );
              if (contactAlreadyInConvo) {
                fromAddressParticipantId = contactAlreadyInConvo.id;
              }
              // if not in the convo, we'll set their id later
            }

            // check all the contacts, users and teams in the incoming email are included in the convo participants
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
            const existingConvoParticipantsTeamIds =
              existingMessage.convo.participants.map((p) => p.teamId);
            const missingUserTeams = routingRuleTeamIds.filter(
              (c) => !existingConvoParticipantsTeamIds.includes(c)
            );

            // - if not, then add them to the convo participants to add array
            if (missingContacts.length) {
              convoParticipantsToAdd.push(
                ...missingContacts.map((contactId) => ({
                  convoId,
                  contactId,
                  orgId,
                  publicId: typeIdGenerator('convoParticipants'),
                  role: 'contributor' as const
                }))
              );
            }
            if (missingOrgMembers.length) {
              convoParticipantsToAdd.push(
                ...missingOrgMembers.map((orgMemberId) => ({
                  convoId,
                  orgMemberId,
                  orgId,
                  publicId: typeIdGenerator('convoParticipants'),
                  role: 'contributor' as const
                }))
              );
            }
            if (missingUserTeams.length) {
              convoParticipantsToAdd.push(
                ...missingUserTeams.map((teamId) => ({
                  convoId,
                  teamId,
                  orgId,
                  publicId: typeIdGenerator('convoParticipants'),
                  role: 'contributor' as const
                }))
              );
            }
          } else {
            // if there is a reply to header but we cant find the conversation, we handle this like its a new convo
            hasReplyToButIsNewConvo = true;
          }
        }

        // create a new convo with new participants
        if (!inReplyToEmailId || hasReplyToButIsNewConvo) {
          const newConvoInsert = await db.insert(convos).values({
            orgId: orgId,
            publicId: typeIdGenerator('convos'),
            lastUpdatedAt: new Date()
          });

          convoId = Number(newConvoInsert.insertId);

          const newConvoSubjectInsert = await db.insert(convoSubjects).values({
            orgId: orgId,
            convoId,
            publicId: typeIdGenerator('convoSubjects'),
            subject: subject
          });

          subjectId = Number(newConvoSubjectInsert.insertId);

          // add the new participants to the convo
          if (contactIds.length) {
            convoParticipantsToAdd.push(
              ...contactIds.map((contactId) => ({
                convoId,
                contactId,
                orgId,
                publicId: typeIdGenerator('convoParticipants'),
                role: 'contributor' as const
              }))
            );
          }
          if (routingRuleOrgMemberIds.length) {
            convoParticipantsToAdd.push(
              ...routingRuleOrgMemberIds.map((orgMemberId) => ({
                convoId,
                orgMemberId,
                orgId,
                publicId: typeIdGenerator('convoParticipants'),
                role: 'contributor' as const
              }))
            );
          }
          if (routingRuleTeamIds.length) {
            convoParticipantsToAdd.push(
              ...routingRuleTeamIds.map((teamId) => ({
                convoId: convoId,
                teamId: teamId,
                orgId: orgId,
                publicId: typeIdGenerator('convoParticipants'),
                role: 'contributor' as const
              }))
            );
          }
        }

        //* start to handle creating the message in the convo

        // We make sure convoId is set
        if (convoId === -1) {
          throw new Error('Convo ID not set, this should never happen');
        }

        if (convoParticipantsToAdd.length) {
          await db.insert(convoParticipants).values(convoParticipantsToAdd);
        }

        if (!fromAddressParticipantId) {
          if (fromAddressPlatformObject.type === 'contact') {
            const contactParticipant =
              await db.query.convoParticipants.findFirst({
                where: and(
                  eq(convoParticipants.orgId, orgId),
                  eq(convoParticipants.convoId, convoId),
                  eq(convoParticipants.contactId, fromAddressPlatformObject?.id)
                ),
                columns: {
                  id: true
                }
              });
            // @ts-expect-error we check and define earlier up
            fromAddressParticipantId = contactParticipant.id;
          } else if (fromAddressPlatformObject.type === 'emailIdentity') {
            // we need to get the first person/team in the routing rule and add them to the convo
            const emailIdentityParticipant =
              await db.query.emailIdentities.findFirst({
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
                          teamId: true,
                          orgMemberId: true
                        }
                      }
                    }
                  }
                }
              });
            const firstDestination =
              // @ts-expect-error, taken form old code, will rewrite later
              emailIdentityParticipant.routingRules.destinations[0]!;
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
            } else if (firstDestination.teamId) {
              convoParticipantFromAddressIdentity =
                await db.query.convoParticipants.findFirst({
                  where: and(
                    eq(convoParticipants.orgId, orgId),
                    eq(convoParticipants.convoId, convoId || 0),
                    eq(convoParticipants.teamId, firstDestination.teamId)
                  ),
                  columns: {
                    id: true
                  }
                });
            }
            // @ts-expect-error, taken form old code, will rewrite later
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
                id,
                postalMessageId: messageId,
                recipient: rcpt_to,
                token: ''
              }
            ],
            emailHeaders: JSON.stringify(parsedEmail.headers)
          }
        };

        const orgShortcode = await db.query.orgs.findFirst({
          where: eq(orgs.id, orgId),
          columns: {
            shortcode: true
          }
        });

        if (!orgShortcode) {
          throw new Error('No org shortcode found');
        }

        const convoEntryBody = tiptapHtml.generateJSON(
          strippedEmail.parsedMessageHtml,
          tipTapExtensions
        );

        const convoEntryBodyPlainText = tiptapCore.generateText(
          convoEntryBody,
          tipTapExtensions
        );

        const insertNewConvoEntry = await db.insert(convoEntries).values({
          orgId,
          publicId: typeIdGenerator('convoEntries'),
          convoId,
          visibility: 'all_participants',
          type: 'message',
          metadata: convoEntryMetadata,
          author: fromAddressParticipantId!,
          body: convoEntryBody,
          bodyPlainText: convoEntryBodyPlainText,
          replyToId,
          subjectId
        });

        await db
          .update(convos)
          .set({
            lastUpdatedAt: new Date()
          })
          .where(eq(convos.id, convoId));

        const uploadedAttachments = await Promise.allSettled(
          attachments.map((attachment) =>
            uploadAndAttachAttachment(
              {
                orgId: orgId,
                fileName:
                  attachment.filename ??
                  generateFileName({
                    identifier:
                      messageFrom[0]?.name ??
                      messageFrom[0]?.address ??
                      'Unknown',
                    fileType: attachment.contentType
                  }),
                fileType: attachment.contentType,
                fileContent: attachment.content,
                convoId: convoId,
                convoEntryId: Number(insertNewConvoEntry.insertId),
                convoParticipantId: fromAddressParticipantId ?? 0,
                fileSize: attachment.size,
                inline: attachment.contentDisposition === 'inline',
                cid: attachment.cid ?? null
              },
              orgPublicId,
              orgShortcode.shortcode
            )
          )
        ).then(
          (results) =>
            results
              .map((r) => {
                if (r.status === 'rejected') {
                  console.error('⛔ error uploading attachment', r.reason);
                } else {
                  return r.value;
                }
              })
              .filter(Boolean) as {
              attachmentUrl: string;
              cid: string | null;
              inline: boolean;
            }[]
        );

        const parsedEmailMessageHtmlWithAttachments = replaceCidWithUrl(
          strippedEmail.parsedMessageHtml,
          uploadedAttachments
        );

        const parsedFullEmailMessageHtmlWithAttachments = replaceCidWithUrl(
          fullParsedEmail.parsedMessageHtml,
          uploadedAttachments
        );

        const convoEntryBodyWithAttachments = tiptapHtml.generateJSON(
          parsedEmailMessageHtmlWithAttachments,
          tipTapExtensions
        );

        await db
          .update(convoEntries)
          .set({
            body: convoEntryBodyWithAttachments,
            bodyCleanedHtml: sanitize(parsedFullEmailMessageHtmlWithAttachments)
          })
          .where(eq(convoEntries.id, Number(insertNewConvoEntry.insertId)));

        if (replyToId) {
          await db.insert(convoEntryReplies).values({
            entrySourceId: replyToId,
            entryReplyId: Number(insertNewConvoEntry.insertId),
            orgId: orgId
          });
        }

        const originalEmailWithAttachments = replaceCidWithUrl(
          (parsedEmail.html || parsedEmail.textAsHtml) ?? '',
          uploadedAttachments
        );

        await db.insert(convoEntryRawHtmlEmails).values({
          orgId: orgId,
          entryId: Number(insertNewConvoEntry.insertId),
          html: originalEmailWithAttachments,
          headers: Object.fromEntries(parsedEmail.headers),
          wipeDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28) // 28 days
        });

        await sendRealtimeNotification({
          newConvo: (!inReplyToEmailId || hasReplyToButIsNewConvo) ?? false,
          convoId: convoId,
          convoEntryId: +insertNewConvoEntry.insertId
        });
      } catch (e) {
        span?.recordException(e as Error);
        console.error('Error processing email');
        await discord.info(`Mailbridge Queue Error\n${(e as Error).message}`);
        // Throw the error to be caught by the worker, and moving to failed jobs
        throw e;
      }
    }),
  {
    connection: {
      host: host.split(':')[0],
      port: Number(port),
      username,
      password
    }
  }
);

async function resolveOrgAndMailserver({
  mailserverId,
  orgId,
  rcpt_to
}: MailParamsSchema & {
  rcpt_to: string;
}): Promise<{
  orgId: number;
  orgPublicId: `o_${string}`;
  forwardedEmailAddress: string | null;
}> {
  if (orgId === 0 && mailserverId === 'root') {
    const [username, domain] = rcpt_to.split('@') as [string, string]; // we have verified that rcpt_to is an email address
    const rootEmailIdentity = await db.query.emailIdentities.findFirst({
      where: and(
        eq(emailIdentities.username, username),
        eq(emailIdentities.domainName, domain)
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
    if (!rootEmailIdentity)
      throw new Error(`No email identity found for root email`);
    return {
      orgId: rootEmailIdentity.orgId,
      orgPublicId: rootEmailIdentity.org.publicId,
      forwardedEmailAddress: null
    };
  } else if (orgId === 0 && mailserverId === 'fwd') {
    const fwdEmailIdentity = await db.query.emailIdentities.findFirst({
      where: eq(emailIdentities.forwardingAddress, rcpt_to),
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
    if (!fwdEmailIdentity)
      throw new Error(`No email identity found for forward email: ${rcpt_to}`);

    return {
      orgId: fwdEmailIdentity.orgId,
      orgPublicId: fwdEmailIdentity.org.publicId,
      forwardedEmailAddress: `${fwdEmailIdentity.username}@${fwdEmailIdentity.domainName}`
    };
  } else if (
    // Checks to narrow down the mailserverId
    orgId !== 0 &&
    mailserverId !== 'root' &&
    mailserverId !== 'fwd'
  ) {
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
    if (!mailServer || mailServer.orgId !== orgId)
      throw new Error(`Mailserver not found or does not belong to the org`);

    return {
      orgId: mailServer.orgId,
      orgPublicId: mailServer.org.publicId,
      forwardedEmailAddress: null
    };
  } else
    throw new Error(
      `Invalid orgId and mailserverId: ${JSON.stringify({ orgId, mailserverId })}`
    );
}

interface UploadAndAttachAttachmentInput {
  orgId: number;
  fileName: string;
  fileType: string;
  fileContent: Buffer;
  fileSize: number;
  convoId: number;
  convoEntryId: number;
  convoParticipantId: number;
  inline: boolean;
  cid: string | null;
}

type PreSignedData = {
  publicId: string;
  signedUrl: string;
};

async function uploadAndAttachAttachment(
  input: UploadAndAttachAttachmentInput,
  orgPublicId: TypeId<'org'>,
  orgShortcode: string
) {
  const preUpload = (await fetch(
    `${env.STORAGE_URL}/api/attachments/internalPresign`,
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: env.STORAGE_KEY
      },
      body: JSON.stringify({
        orgPublicId,
        filename: input.fileName
      })
    }
  ).then((r) => r.json())) as PreSignedData;

  if (!preUpload?.publicId || !preUpload.signedUrl) {
    throw new Error('Missing attachmentPublicId or presignedUrl');
  }

  const attachmentPublicId = preUpload.publicId;
  const presignedUrl = preUpload.signedUrl;

  if (!validateTypeId('convoAttachments', attachmentPublicId)) {
    throw new Error('Invalid attachmentPublicId');
  }

  try {
    await fetch(presignedUrl, {
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
    size: input.fileSize,
    inline: input.inline
  });

  return {
    attachmentUrl: `${env.STORAGE_URL}/attachment/${orgShortcode}/${attachmentPublicId}/${input.fileName}`,
    cid: input.cid,
    inline: input.inline
  };
}

function replaceCidWithUrl(
  html: string,
  attachments: { cid: string | null; attachmentUrl: string; inline: boolean }[]
) {
  return attachments
    .filter((_) => _.inline)
    .reduce(
      (acc, attachment) =>
        acc.replaceAll(`cid:${attachment.cid}`, attachment.attachmentUrl),
      html
    );
}

// Expand this function to handle more automatic filename generation
type GenerationContext = {
  fileType: string;
  identifier: string;
};

function generateFileName({ identifier, fileType }: GenerationContext) {
  switch (fileType) {
    case 'text/calendar':
      return `${identifier} Calender Invite.ics`;
    default:
      return `Attachment (${identifier}) ${new Date().toDateString()}.${mime.getExtension(fileType) ?? 'bin'}`;
  }
}
