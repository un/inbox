import { z } from 'zod';
import { parse } from 'superjson';
import { router, orgProcedure } from '../../trpc';
import {
  type InferInsertModel,
  and,
  eq,
  inArray,
  desc,
  or,
  lt
} from '@u22n/database/orm';
import {
  convos,
  convoParticipants,
  convoSubjects,
  orgMemberProfiles,
  groups,
  orgMembers,
  contacts,
  contactGlobalReputations,
  convoEntries,
  emailIdentitiesAuthorizedOrgMembers,
  groupMembers,
  type ConvoEntryMetadataEmailAddress,
  convoAttachments,
  pendingAttachments
} from '@u22n/database/schema';
import {
  typeIdValidator,
  validateTypeId,
  type TypeId,
  typeIdGenerator
} from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { tiptapCore, tiptapHtml, type tiptapVue3 } from '@u22n/tiptap';
import { convoEntryRouter } from './entryRouter';
import { mailBridgeTrpcClient } from '../../../utils/tRPCServerClients';

export const convoRouter = router({
  entries: convoEntryRouter,
  createNewConvo: orgProcedure
    .input(
      z.object({
        participantsOrgMembersPublicIds: z.array(typeIdValidator('orgMembers')),
        participantsGroupsPublicIds: z.array(typeIdValidator('groups')),
        participantsContactsPublicIds: z.array(
          typeIdValidator('orgMemberProfile')
        ),
        participantsEmails: z.array(z.string()),
        sendAsEmailIdentityPublicId:
          typeIdValidator('emailIdentities').optional(),
        to: z
          .object({
            type: z.enum(['orgMember', 'group', 'contact']),
            publicId: typeIdValidator('orgMembers')
              .or(typeIdValidator('groups'))
              .or(typeIdValidator('contacts'))
          })
          .or(
            z.object({
              type: z.enum(['email']),
              emailAddress: z.string().min(3)
            })
          ),
        topic: z.string().min(1),
        message: z.string().min(1),
        firstMessageType: z.enum(['message', 'draft', 'comment']),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            attachmentPublicId: typeIdValidator('convoAttachments'),
            size: z.number(),
            type: z.string()
          })
        )
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'account or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'account is not a member of the organization'
        });
      }

      const accountOrgMemberId = org?.memberId;
      const orgId = org?.id;
      const {
        sendAsEmailIdentityPublicId,
        participantsEmails,
        participantsOrgMembersPublicIds,
        participantsGroupsPublicIds,
        participantsContactsPublicIds,
        topic,
        message: messageString,
        to: convoMessageTo
      } = input;

      const message: tiptapVue3.JSONContent = parse(messageString);

      // early check if "to" value has a valid email address, if not, then return an error
      let convoMetadataToAddress: ConvoEntryMetadataEmailAddress | undefined;
      const convoMetadataCcAddresses: ConvoEntryMetadataEmailAddress[] = [];

      async function getConvoToAddress() {
        const convoMessageToType = convoMessageTo.type;
        if (convoMessageToType === 'email') {
          return convoMessageTo.emailAddress;
        } else if (convoMessageToType === 'contact') {
          if (!validateTypeId('contacts', convoMessageTo.publicId)) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                "You caught a bug that shouldn't exist, please contact support"
            });
          }

          const contactResponse = await db.query.contacts.findFirst({
            where: eq(contacts.publicId, convoMessageTo.publicId),
            columns: {
              id: true,
              emailUsername: true,
              emailDomain: true
            }
          });
          if (!contactResponse) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: 'TO address contact not found'
            });
          }
          convoMetadataToAddress = { id: +contactResponse.id, type: 'contact' };
          return `${contactResponse.emailUsername}@${contactResponse.emailDomain}`;
        } else if (convoMessageToType === 'group') {
          if (!validateTypeId('groups', convoMessageTo.publicId)) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                "You caught a bug that shouldn't exist, please contact support"
            });
          }

          const groupResponse = await db.query.groups.findFirst({
            where: eq(groups.publicId, convoMessageTo.publicId),
            columns: {
              id: true,
              name: true
            }
          });
          if (!groupResponse) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: 'TO address group not found'
            });
          }
          const emailIdentitiesResponse =
            await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
              where: and(
                eq(
                  emailIdentitiesAuthorizedOrgMembers.groupId,
                  groupResponse.id
                ),
                eq(emailIdentitiesAuthorizedOrgMembers.default, true)
              ),
              columns: {
                id: true
              },
              with: {
                identity: {
                  columns: {
                    username: true,
                    domainName: true
                  }
                }
              }
            });
          if (!emailIdentitiesResponse) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: `${groupResponse.name} Group does not have a default email identity set and cant be set as the TO address`
            });
          }
          convoMetadataToAddress = {
            id: +emailIdentitiesResponse.id,
            type: 'emailIdentity'
          };
          return `${emailIdentitiesResponse.identity.username}@${emailIdentitiesResponse.identity.domainName}`;
        } else if (convoMessageToType === 'orgMember') {
          if (!validateTypeId('orgMembers', convoMessageTo.publicId)) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message:
                "You caught a bug that shouldn't exist, please contact support"
            });
          }
          const orgMemberResponse = await db.query.orgMembers.findFirst({
            where: eq(orgMembers.publicId, convoMessageTo.publicId),
            columns: {
              id: true
            },
            with: {
              profile: {
                columns: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          });
          if (!orgMemberResponse) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: 'TO address user not found'
            });
          }
          const emailIdentitiesResponse =
            await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
              where: and(
                eq(
                  emailIdentitiesAuthorizedOrgMembers.orgMemberId,
                  orgMemberResponse.id
                ),
                eq(emailIdentitiesAuthorizedOrgMembers.default, true)
              ),
              columns: {
                id: true
              },
              with: {
                identity: {
                  columns: {
                    username: true,
                    domainName: true
                  }
                }
              }
            });
          if (!emailIdentitiesResponse) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: `${orgMemberResponse.profile.firstName} ${orgMemberResponse.profile.lastName} User does not have a default email identity set and cant be set as the TO address`
            });
          }
          convoMetadataToAddress = {
            id: +emailIdentitiesResponse.id,
            type: 'emailIdentity'
          };
          return `${emailIdentitiesResponse.identity.username}@${emailIdentitiesResponse.identity.domainName}`;
        } else {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'TO address type is invalid'
          });
        }
      }
      let newConvoToEmailAddress: string;
      if (participantsContactsPublicIds.length || participantsEmails.length) {
        newConvoToEmailAddress = await getConvoToAddress();
      } else {
        newConvoToEmailAddress = '';
      }

      const orgMemberIds: number[] = [];
      const orgGroupIds: number[] = [];
      const orgContactIds: number[] = [];
      const orgContactReputationIds: number[] = [];

      // validate the publicIds of Users and get the IDs
      if (
        participantsOrgMembersPublicIds &&
        participantsOrgMembersPublicIds.length
      ) {
        const orgMemberResponses = await db.query.orgMembers.findMany({
          where: inArray(orgMembers.publicId, participantsOrgMembersPublicIds),
          columns: {
            id: true
          }
        });
        orgMemberIds.push(
          ...orgMemberResponses.map((orgMembers) => orgMembers.id)
        );

        if (orgMemberIds.length !== participantsOrgMembersPublicIds.length) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'One or more users is invalid'
          });
        }
      }

      // validate the publicIds of Groups and get the IDs
      if (participantsGroupsPublicIds && participantsGroupsPublicIds.length) {
        const groupResponses = await db.query.groups.findMany({
          where: inArray(groups.publicId, participantsGroupsPublicIds),
          columns: {
            id: true
          }
        });
        orgGroupIds.push(...groupResponses.map((groups) => groups.id));

        if (orgGroupIds.length !== participantsGroupsPublicIds.length) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'One or more groups is invalid'
          });
        }
      }

      // validate the publicIds of Contacts and get the IDs
      if (
        participantsContactsPublicIds &&
        participantsContactsPublicIds.length
      ) {
        const contactResponses = await db.query.contacts.findMany({
          where: inArray(
            orgMemberProfiles.publicId,
            participantsContactsPublicIds
          ),
          columns: {
            id: true
          }
        });
        orgContactIds.push(...contactResponses.map((contact) => contact.id));

        if (orgContactIds.length !== participantsContactsPublicIds.length) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'One or more contacts is invalid'
          });
        }
      }

      // for each of participantsEmails check if a contact or contact reputation exists. if no reputation create one, if reputation but no org contact create one, if reputation and org contact get ID

      if (participantsEmails && participantsEmails.length) {
        for (const email of participantsEmails) {
          const [emailUsername = '', emailDomain = ''] = email.split('@');
          const existingContact = await db.query.contacts.findFirst({
            where: and(
              eq(contacts.emailUsername, emailUsername),
              eq(contacts.emailDomain, emailDomain),
              eq(contacts.orgId, orgId)
            ),
            columns: {
              id: true,
              reputationId: true
            }
          });

          if (existingContact) {
            if (newConvoToEmailAddress === email && !convoMetadataToAddress) {
              convoMetadataToAddress = {
                id: +existingContact.id,
                type: 'contact'
              };
            } else {
              convoMetadataCcAddresses.push({
                id: +existingContact.id,
                type: 'contact'
              });
            }
            orgContactIds.push(existingContact.id);
            orgContactReputationIds.push(existingContact.reputationId);
          } else {
            const existingContactGlobalReputations =
              await db.query.contactGlobalReputations.findFirst({
                where: eq(contactGlobalReputations.emailAddress, email),
                columns: {
                  id: true
                }
              });

            if (existingContactGlobalReputations) {
              const newContactPublicId = typeIdGenerator('contacts');
              const newContactInsertResponse = await db
                .insert(contacts)
                .values({
                  publicId: newContactPublicId,
                  type: 'person',
                  orgId: orgId,
                  reputationId: existingContactGlobalReputations.id,
                  emailUsername: emailUsername,
                  emailDomain: emailDomain,
                  screenerStatus: 'approve'
                });
              if (newConvoToEmailAddress === email && !convoMetadataToAddress) {
                convoMetadataToAddress = {
                  id: +newContactInsertResponse.insertId,
                  type: 'contact'
                };
              } else {
                convoMetadataCcAddresses.push({
                  id: +newContactInsertResponse.insertId,
                  type: 'contact'
                });
              }
              orgContactIds.push(+newContactInsertResponse.insertId);
              orgContactReputationIds.push(existingContactGlobalReputations.id);
            } else {
              const newContactGlobalReputationInsertResponse = await db
                .insert(contactGlobalReputations)
                .values({
                  emailAddress: email
                });

              const newContactPublicId = typeIdGenerator('contacts');
              const newContactInsertResponse = await db
                .insert(contacts)
                .values({
                  publicId: newContactPublicId,
                  type: 'person',
                  orgId: orgId,
                  reputationId:
                    +newContactGlobalReputationInsertResponse.insertId,
                  emailUsername: emailUsername,
                  emailDomain: emailDomain,
                  screenerStatus: 'approve'
                });
              if (newConvoToEmailAddress === email && !convoMetadataToAddress) {
                convoMetadataToAddress = {
                  id: +newContactInsertResponse.insertId,
                  type: 'contact'
                };
              } else {
                convoMetadataCcAddresses.push({
                  id: +newContactInsertResponse.insertId,
                  type: 'contact'
                });
              }
              orgContactIds.push(+newContactInsertResponse.insertId);
              orgContactReputationIds.push(
                +newContactGlobalReputationInsertResponse.insertId
              );
            }
          }
        }
      }

      // create the conversation get id
      const newConvoPublicId = typeIdGenerator('convos');
      const insertConvoResponse = await db.insert(convos).values({
        publicId: newConvoPublicId,
        orgId: orgId,
        lastUpdatedAt: new Date()
      });

      // create conversationSubject entry
      const newConvoSubjectPublicId = typeIdGenerator('convoSubjects');
      const insertConvoSubjectResponse = await db.insert(convoSubjects).values({
        orgId: orgId,
        convoId: +insertConvoResponse.insertId,
        publicId: newConvoSubjectPublicId,
        subject: topic
      });

      // create conversationParticipants Entries
      if (orgMemberIds.length) {
        const convoParticipantsDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgMemberIds.forEach((orgMemberId) => {
          const convoMemberPublicId = typeIdGenerator('convoParticipants');
          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            orgMemberId: orgMemberId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoParticipantsDbInsertValuesArray);
      }

      if (orgGroupIds.length) {
        const convoParticipantsDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgGroupIds.forEach((groupId) => {
          const convoMemberPublicId = typeIdGenerator('convoParticipants');
          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            groupId: groupId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoParticipantsDbInsertValuesArray);
      }

      if (orgContactIds.length) {
        const convoParticipantsDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgContactIds.forEach((contactId) => {
          const convoMemberPublicId = typeIdGenerator('convoParticipants');
          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            contactId: contactId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoParticipantsDbInsertValuesArray);
      }
      const authorConvoParticipantPublicId =
        typeIdGenerator('convoParticipants');
      const insertAuthorConvoParticipantResponse = await db
        .insert(convoParticipants)
        .values({
          orgId: orgId,
          convoId: +insertConvoResponse.insertId,
          publicId: authorConvoParticipantPublicId,
          orgMemberId: accountOrgMemberId,
          role: 'assigned'
        });

      // create convoEntry

      const newConvoBody = message;
      const newConvoBodyPlainText = tiptapCore.generateText(
        newConvoBody,
        tipTapExtensions
      );

      const newConvoEntryPublicId = typeIdGenerator('convoEntries');
      const insertConvoEntryResponse = await db.insert(convoEntries).values({
        orgId: orgId,
        publicId: newConvoEntryPublicId,
        convoId: +insertConvoResponse.insertId,
        author: +insertAuthorConvoParticipantResponse.insertId,
        visibility: 'all_participants',
        subjectId: +insertConvoSubjectResponse.insertId,
        type: input.firstMessageType,
        body: newConvoBody,
        bodyPlainText: newConvoBodyPlainText
      });

      //* if convo has attachments, add them to the convo
      const attachmentsToSend: {
        orgPublicId: string;
        attachmentPublicId: string;
        fileName: string;
        fileType: string;
      }[] = [];
      const pendingAttachmentsToRemoveFromPending: TypeId<'convoAttachments'>[] =
        [];
      if (input.attachments.length > 0) {
        const convoAttachmentsDbInsertValuesArray: InferInsertModel<
          typeof convoAttachments
        >[] = [];
        input.attachments.forEach((attachment) => {
          convoAttachmentsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            convoEntryId: +insertConvoEntryResponse.insertId,
            convoParticipantId: +insertAuthorConvoParticipantResponse.insertId,
            publicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            type: attachment.type,
            size: attachment.size
          });
          attachmentsToSend.push({
            orgPublicId: org.publicId,
            attachmentPublicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            fileType: attachment.type
          });
          pendingAttachmentsToRemoveFromPending.push(
            attachment.attachmentPublicId
          );
        });
        await db
          .insert(convoAttachments)
          .values(convoAttachmentsDbInsertValuesArray);

        // insertedAttachmentIds = +insertAttachmentsResponse.insertId;
      }

      //* if convo has contacts, send external email via mail bridge
      const convoHasEmailParticipants = orgContactIds.length > 0;
      const missingEmailIdentitiesWarnings: {
        type: 'user' | 'group';
        publicId: String;
        name: String;
      }[] = [];

      if (convoHasEmailParticipants) {
        const newConvoBodyHTML = tiptapHtml.generateHTML(
          newConvoBody,
          tipTapExtensions
        );
        const ccEmailAddresses: string[] = [];
        // get the email addresses for all contacts
        await Promise.all(
          orgContactIds.map(async (contactId) => {
            const contactResponse = await db.query.contacts.findFirst({
              where: eq(contacts.id, contactId),
              columns: {
                emailUsername: true,
                emailDomain: true
              }
            });
            if (contactResponse) {
              ccEmailAddresses.push(
                `${contactResponse.emailUsername}@${contactResponse.emailDomain}`
              );
            }
          })
        );

        // get the default email addresses for all users
        if (orgMemberIds.length) {
          await Promise.all(
            orgMemberIds.map(async (orgMemberId) => {
              const emailIdentityResponse =
                await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
                  where: and(
                    eq(
                      emailIdentitiesAuthorizedOrgMembers.orgMemberId,
                      orgMemberId
                    ),
                    eq(emailIdentitiesAuthorizedOrgMembers.default, true)
                  ),
                  columns: {
                    id: true
                  },
                  with: {
                    identity: {
                      columns: {
                        username: true,
                        domainName: true
                      }
                    }
                  }
                });
              if (!emailIdentityResponse) {
                const memberProfile = await db.query.orgMembers.findFirst({
                  where: eq(orgMembers.id, orgMemberId),
                  columns: {
                    publicId: true
                  },
                  with: {
                    profile: {
                      columns: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                });
                if (memberProfile) {
                  missingEmailIdentitiesWarnings.push({
                    type: 'user',
                    publicId: memberProfile.publicId,
                    name: `${memberProfile.profile.firstName} ${memberProfile.profile.lastName}`
                  });
                  return;
                }
              }
              if (emailIdentityResponse) {
                convoMetadataCcAddresses.push({
                  id: +emailIdentityResponse.id,
                  type: 'emailIdentity'
                });
                ccEmailAddresses.push(
                  `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                );
              }
            })
          );
        }

        // get the default email addresses for all groups
        if (orgGroupIds.length) {
          await Promise.all(
            orgGroupIds.map(async (orgGroupId) => {
              const emailIdentityResponse =
                await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
                  where: and(
                    eq(emailIdentitiesAuthorizedOrgMembers.groupId, orgGroupId),
                    eq(emailIdentitiesAuthorizedOrgMembers.default, true)
                  ),
                  columns: {
                    id: true
                  },
                  with: {
                    identity: {
                      columns: {
                        username: true,
                        domainName: true
                      }
                    }
                  }
                });
              if (!emailIdentityResponse) {
                const orgGroupResponse = await db.query.groups.findFirst({
                  where: eq(groups.id, orgGroupId),
                  columns: {
                    publicId: true,
                    name: true
                  }
                });

                if (orgGroupResponse) {
                  missingEmailIdentitiesWarnings.push({
                    type: 'group',
                    publicId: orgGroupResponse.publicId,
                    name: orgGroupResponse.name
                  });
                  return;
                }
              }
              if (emailIdentityResponse) {
                convoMetadataCcAddresses.push({
                  id: +emailIdentityResponse.id,
                  type: 'emailIdentity'
                });
                ccEmailAddresses.push(
                  `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                );
              }
            })
          );
        }

        // remove TO email address from CCs if it exists
        const ccEmailAddressesFiltered = ccEmailAddresses.filter(
          (emailAddress) => {
            return emailAddress !== newConvoToEmailAddress;
          }
        );

        const mailBridgeSendMailResponse =
          await mailBridgeTrpcClient.mail.send.sendNewEmail.mutate({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            entryId: +insertConvoEntryResponse.insertId,
            sendAsEmailIdentityPublicId: sendAsEmailIdentityPublicId || '',
            toEmail: newConvoToEmailAddress,
            ccEmail: ccEmailAddressesFiltered,
            subject: topic,
            bodyHtml: newConvoBodyHTML,
            bodyPlainText: newConvoBodyPlainText,
            attachments: attachmentsToSend
          });

        if (
          !mailBridgeSendMailResponse.success ||
          !mailBridgeSendMailResponse.metadata ||
          !mailBridgeSendMailResponse.metadata.email
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'Something went wrong when trying to send the message, please contact support'
          });
        }

        mailBridgeSendMailResponse.metadata.email.to = [
          convoMetadataToAddress!
        ];
        mailBridgeSendMailResponse.metadata.email.cc = convoMetadataCcAddresses;

        await db
          .update(convoEntries)
          .set({
            metadata: mailBridgeSendMailResponse.metadata
          })
          .where(eq(convoEntries.id, +insertConvoEntryResponse.insertId));

        if (
          input.attachments.length > 0 &&
          pendingAttachmentsToRemoveFromPending.length > 0
        ) {
          await db
            .delete(pendingAttachments)
            .where(
              and(
                eq(pendingAttachments.orgId, orgId),
                inArray(
                  pendingAttachments.publicId,
                  pendingAttachmentsToRemoveFromPending
                )
              )
            );
        }
      }

      return {
        status: 'success',
        publicId: newConvoPublicId,
        missingEmailIdentities: missingEmailIdentitiesWarnings
      };
    }),

  //* get a specific conversation
  getConvo: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account, org } = ctx;

      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'account or Organization is not defined'
        });
      }
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'account is not a member of the organization'
        });
      }

      const accountId = account.id;
      const orgId = org.id;
      const accountOrgMemberId = org.memberId;

      const { convoPublicId } = input;

      // check if the conversation belongs to the same org, early return if not before multiple db selects
      const convoResponse = await db.query.convos.findFirst({
        where: eq(convos.publicId, convoPublicId),
        columns: {
          id: true,
          orgId: true
        }
      });
      if (!convoResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found'
        });
      }
      if (Number(convoResponse.orgId) !== orgId) {
        const convoOrgOwnerMembersIds = await db.query.orgMembers.findMany({
          where: eq(orgMembers.orgId, convoResponse.orgId),
          columns: {
            accountId: true
          },
          with: {
            org: {
              columns: {
                name: true
              }
            }
          }
        });
        const convoOrgOwnerUserIds = convoOrgOwnerMembersIds.map((member) =>
          Number(member?.accountId ?? 0)
        );
        if (!convoOrgOwnerUserIds.includes(accountId)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          });
        }
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Conversation is not owned by your organization.`
        });
      }

      // TODO: Add filtering for org based on input.filterOrgPublicId
      const convoDetails = await db.query.convos.findFirst({
        columns: {
          publicId: true,
          lastUpdatedAt: true,
          createdAt: true
        },
        where: eq(convos.id, convoResponse.id),
        with: {
          subjects: {
            columns: {
              publicId: true,
              subject: true
            }
          },
          participants: {
            columns: {
              publicId: true,
              orgMemberId: true,
              groupId: true,
              contactId: true,
              lastReadAt: true,
              notifications: true,
              active: true,
              role: true
            },
            with: {
              orgMember: {
                columns: {
                  id: true,
                  publicId: true
                },
                with: {
                  profile: {
                    columns: {
                      avatarId: true,
                      firstName: true,
                      lastName: true,
                      publicId: true,
                      handle: true,
                      title: true
                    }
                  }
                }
              },
              group: {
                columns: {
                  avatarId: true,
                  id: true,
                  name: true,
                  color: true,
                  publicId: true,
                  description: true
                },
                with: {
                  members: {
                    columns: {
                      orgMemberId: true
                    }
                  }
                }
              },
              contact: {
                columns: {
                  avatarId: true,
                  publicId: true,
                  name: true,
                  emailUsername: true,
                  emailDomain: true,
                  setName: true,
                  signaturePlainText: true,
                  signatureHtml: true
                }
              }
            }
          },
          attachments: {
            columns: {
              publicId: true,
              fileName: true,
              type: true
            }
          }
        }
      });
      if (!convoDetails) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found'
        });
      }

      // Find the participant.publicId for the accountOrgMemberId
      let participantPublicId: string | undefined;

      // Check if the user's orgMemberId is in the conversation participants
      convoDetails?.participants.forEach((participant) => {
        if (participant.orgMember?.id === accountOrgMemberId) {
          participantPublicId = participant.publicId;
        }
      });

      // If not found, check if the user's orgMemberId is in any participant's group members
      if (!participantPublicId) {
        convoDetails?.participants.forEach((participant) => {
          participant.group?.members.forEach((groupMember) => {
            if (groupMember.orgMemberId === accountOrgMemberId) {
              participantPublicId = participant.publicId;
            }
          });
        });
      }

      // If participantPublicId is still not found, the user is not a participant of this conversation
      if (!participantPublicId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this conversation'
        });
      }

      // strip the user IDs from the response
      convoDetails.participants.forEach((participant) => {
        if (participant.orgMember?.id) participant.orgMember.id = 0;
        participant.group?.members.forEach((groupMember) => {
          if (groupMember.orgMemberId) groupMember.orgMemberId = 0;
        });
      });
      return {
        data: convoDetails,
        participantPublicId: participantPublicId
      };
    }),

  //* get convo entries
  getConvoEntries: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos'),
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: typeIdValidator('convos').optional()
      })
    )
    .query(async () => {}),

  getUserConvos: orgProcedure
    .input(
      z.object({
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: typeIdValidator('convos').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { cursorLastUpdatedAt, cursorLastPublicId } = input;

      const orgMemberId = org.memberId;

      const inputLastUpdatedAt = cursorLastUpdatedAt
        ? new Date(cursorLastUpdatedAt)
        : new Date();

      const inputLastPublicId = cursorLastPublicId || 'c_';

      const convoQuery = await db.query.convos.findMany({
        orderBy: [desc(convos.lastUpdatedAt), desc(convos.publicId)],
        limit: 15,
        columns: {
          publicId: true,
          lastUpdatedAt: true
        },
        where: and(
          or(
            and(
              eq(convos.lastUpdatedAt, inputLastUpdatedAt),
              lt(convos.publicId, inputLastPublicId)
            ),
            lt(convos.lastUpdatedAt, inputLastUpdatedAt)
          ),
          inArray(
            convos.id,
            db
              .select({ id: convoParticipants.convoId })
              .from(convoParticipants)
              .where(
                or(
                  eq(convoParticipants.orgMemberId, orgMemberId),
                  inArray(
                    convoParticipants.groupId,
                    db
                      .select({ id: groupMembers.groupId })
                      .from(groupMembers)
                      .where(eq(groupMembers.orgMemberId, orgMemberId))
                  )
                )
              )
          )
        ),
        with: {
          subjects: {
            columns: {
              subject: true
            }
          },
          participants: {
            columns: {
              role: true,
              publicId: true
            },
            with: {
              orgMember: {
                columns: { publicId: true },
                with: {
                  profile: {
                    columns: {
                      publicId: true,
                      firstName: true,
                      lastName: true,
                      avatarId: true,
                      handle: true
                    }
                  }
                }
              },
              group: {
                columns: {
                  publicId: true,
                  name: true,
                  color: true,
                  avatarId: true
                }
              },
              contact: {
                columns: {
                  publicId: true,
                  name: true,
                  avatarId: true,
                  setName: true,
                  emailUsername: true,
                  emailDomain: true,
                  type: true,
                  signaturePlainText: true,
                  signatureHtml: true
                }
              }
            }
          },
          entries: {
            orderBy: [desc(convoEntries.createdAt)],
            limit: 1,
            columns: {
              bodyPlainText: true,
              type: true
            },
            with: {
              author: {
                columns: {},
                with: {
                  orgMember: {
                    columns: {
                      publicId: true
                    },
                    with: {
                      profile: {
                        columns: {
                          publicId: true,
                          firstName: true,
                          lastName: true,
                          avatarId: true,
                          handle: true
                        }
                      }
                    }
                  },
                  group: {
                    columns: {
                      publicId: true,
                      name: true,
                      color: true,
                      avatarId: true
                    }
                  },
                  contact: {
                    columns: {
                      publicId: true,
                      name: true,
                      avatarId: true,
                      setName: true,
                      emailUsername: true,
                      emailDomain: true,
                      type: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!convoQuery.length) {
        return {
          data: [],
          cursor: null
        };
      }

      const newCursorLastUpdatedAt =
        convoQuery[convoQuery.length - 1]!.lastUpdatedAt;
      const newCursorLastPublicId = convoQuery[convoQuery.length - 1]!.publicId;

      return {
        data: convoQuery,
        cursor: {
          lastUpdatedAt: newCursorLastUpdatedAt,
          lastPublicId: newCursorLastPublicId
        }
      };
    })
});
