import { zValidator } from '@hono/zod-validator';
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
import { eq, and, inArray, type InferInsertModel } from '@u22n/database/orm';
import {
  typeIdGenerator,
  typeIdValidator,
  validateTypeId,
  type TypeId
} from '@u22n/utils';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@u22n/database';
import { parseMessage } from '@u22n/mailtools';
import type { MessageParseAddressPlatformObject } from '../types';
import { parseAddressIds } from '../utils/contactParsing';
import { tiptapCore, tiptapHtml } from '@u22n/tiptap';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { sendRealtimeNotification } from '../utils/realtime';
import { simpleParser, type EmailAddress } from 'mailparser';
import { env } from '../env';

export const inboundApi = new Hono().post(
  '/mail/inbound/:orgId/:mailserverId',
  zValidator(
    'json',
    z.object({
      id: z.number(),
      rcpt_to: z.string().email(),
      mail_from: z.string(),
      message: z.string(),
      base64: z.boolean(),
      size: z.number()
    })
  ),
  zValidator(
    'param',
    z.object({
      orgId: z.coerce.number(),
      mailserverId: z.enum(['root', 'fwd']).or(typeIdValidator('postalServers'))
    })
  ),
  async (c) => {
    const { id, rcpt_to, message, base64 } = c.req.valid('json');
    let { orgId } = c.req.valid('param');
    const { mailserverId } = c.req.valid('param');

    const handleEmailAsync = async () => {
      let resolvedOrgPublicId: TypeId<'org'> | null = null;
      let forwardedEmailAddress: string | null = null;

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
        if (!rootEmailIdentity) {
          console.error('⛔ no email identity found for root email', {
            id
          });
          return;
        }
        orgId = rootEmailIdentity.orgId;
        resolvedOrgPublicId = rootEmailIdentity.org.publicId;
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
        if (!fwdEmailIdentity) {
          console.error('⛔ no email identity found for fwd email', {
            rcpt_to
          });

          return;
        }
        orgId = fwdEmailIdentity.orgId;
        resolvedOrgPublicId = fwdEmailIdentity.org.publicId;
        forwardedEmailAddress = rcpt_to;
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
        if (!mailServer || mailServer.orgId !== orgId) {
          console.error(
            '⛔ mailserver not found or does not belong to this org',
            {
              orgId,
              mailserverId,
              emailId: id
            }
          );
          return;
        }
        orgId = mailServer.orgId;
        resolvedOrgPublicId = mailServer.org.publicId;
      } else {
        // this should never happen, added to narrow down null types on resolved variables
        console.error('⛔ invalid orgId and mailserverId', {
          orgId,
          mailserverId
        });
        return;
      }

      const payloadEmail = base64
        ? Buffer.from(message, 'base64').toString('utf-8')
        : message;

      const parsedEmail = await simpleParser(payloadEmail, {
        skipImageLinks: true
      });

      if (!parsedEmail.from) {
        console.error('⛔ no from address found in the email', {
          id
        });
        return;
      }

      if (!parsedEmail.to) {
        console.error('⛔ no to address found in the email', {
          id
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
          id
        });
        return;
      }

      if (parsedEmail.from.value.length > 1) {
        console.error(
          '⛔ multiple from addresses detected in a message, only using first email address',
          { id }
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
          if (
            messageFrom.some((email) => email.address === forwardedToAddress)
          ) {
            messageFrom.push(forwardingAddressObject);
          }
          if (
            messageCc?.some((email) => email.address === forwardedToAddress)
          ) {
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
      ] = await Promise.all([
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
          ? parseAddressIds({
              addresses: messageCc,
              addressType: 'cc',
              orgId
            })
          : Promise.resolve([])
      ]);

      if (
        !messageToPlatformObject ||
        !messageToPlatformObject[0] ||
        !messageFromPlatformObject ||
        !messageFromPlatformObject[0]
      ) {
        console.error(
          '⛔ no messageToPlatformObject or messageFromPlatformObject found',
          {
            id
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
            id
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

      const messageAddressIds = (
        Array.isArray(messageToPlatformObject) ? messageToPlatformObject : []
      )
        .concat(
          Array.isArray(messageFromPlatformObject)
            ? messageFromPlatformObject
            : []
        )
        .concat(
          Array.isArray(messageCcPlatformObject) ? messageCcPlatformObject : []
        );

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
        console.error('⛔ no email identity ids found', {
          messageAddressIds
        });
        return;
      }

      // get the routing rule destinations for each of the email addresses, then get the users and contacts within those routing rules

      const routingRuleTeamIds: number[] = [];
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
                  teamId: true,
                  orgMemberId: true
                }
              }
            }
          }
        }
      });

      emailIdentityResponse.forEach((emailIdentity) => {
        emailIdentity.routingRules.destinations.forEach((destination) => {
          if (destination.teamId) {
            routingRuleTeamIds.push(destination.teamId);
          } else if (destination.orgMemberId) {
            routingRuleOrgMemberIds.push(destination.orgMemberId);
          }
        });
      });

      //* start to process the conversation
      let hasReplyToButIsNewConvo: boolean | null = null;
      let convoId: number = -1;
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
          id
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
            console.error('⛔ no convoId found for existing message', {
              id
            });
            return;
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
          const contactParticipant = await db.query.convoParticipants.findFirst(
            {
              where: and(
                eq(convoParticipants.orgId, orgId),
                eq(convoParticipants.convoId, convoId),
                eq(convoParticipants.contactId, fromAddressPlatformObject?.id)
              ),
              columns: {
                id: true
              }
            }
          );
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
                  eq(convoParticipants.teamId, firstDestination!.teamId)
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
        console.error('⛔ no org shortcode found', {
          id
        });
        return;
      }

      const convoEntryBody = tiptapHtml.generateJSON(
        parsedEmailMessage.parsedMessageHtml,
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

      const uploadedAttachments = await Promise.allSettled(
        attachments.map((attachment) =>
          uploadAndAttachAttachment(
            {
              orgId: orgId,
              fileName: attachment.filename || 'No_Filename',
              fileType: attachment.contentType,
              fileContent: attachment.content,
              convoId: convoId,
              convoEntryId: Number(insertNewConvoEntry.insertId),
              convoParticipantId: fromAddressParticipantId || 0,
              fileSize: attachment.size,
              inline: attachment.contentDisposition === 'inline',
              cid: attachment.cid || null
            },
            resolvedOrgPublicId,
            orgShortcode?.shortcode || ''
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
        parsedEmailMessage.parsedMessageHtml,
        uploadedAttachments
      );

      const convoEntryBodyWithAttachments = tiptapHtml.generateJSON(
        parsedEmailMessageHtmlWithAttachments,
        tipTapExtensions
      );

      await db
        .update(convoEntries)
        .set({
          body: convoEntryBodyWithAttachments
        })
        .where(eq(convoEntries.id, Number(insertNewConvoEntry.insertId)));

      if (replyToId) {
        await db.insert(convoEntryReplies).values({
          entrySourceId: replyToId,
          entryReplyId: +insertNewConvoEntry.insertId,
          orgId: orgId
        });
      }

      const originalEmailWithAttachments = replaceCidWithUrl(
        parsedEmail.html || parsedEmail.textAsHtml || '',
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
        newConvo: !inReplyToEmailId || hasReplyToButIsNewConvo || false,
        convoId: convoId,
        convoEntryId: +insertNewConvoEntry.insertId
      });
    };

    handleEmailAsync().catch((error) => {
      console.error('Unhandled Error', error);
    });

    return c.text('OK', 200);
  }
);

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

  if (!preUpload || !preUpload.publicId || !preUpload.signedUrl) {
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
