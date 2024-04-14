import { mailBridgeTrpcClient } from './../../../utils/tRPCServerClients';
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
  groups,
  orgMembers,
  contacts,
  contactGlobalReputations,
  convoEntries,
  groupMembers,
  convoAttachments,
  pendingAttachments,
  convoEntryReplies,
  convoSeenTimestamps,
  convoEntrySeenTimestamps,
  convoParticipantGroupMembers,
  emailIdentities
} from '@u22n/database/schema';
import { typeIdValidator, type TypeId, typeIdGenerator } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import { tipTapExtensions } from '@u22n/tiptap/extensions';
import { tiptapCore, type tiptapVue3 } from '@u22n/tiptap';
import { convoEntryRouter } from './entryRouter';
import { realtime, sendRealtimeNotification } from '../../../utils/realtime';

export const convoRouter = router({
  entries: convoEntryRouter,
  createNewConvo: orgProcedure
    .input(
      z.object({
        participantsOrgMembersPublicIds: z.array(typeIdValidator('orgMembers')),
        participantsGroupsPublicIds: z.array(typeIdValidator('groups')),
        participantsContactsPublicIds: z.array(typeIdValidator('contacts')),
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
        to: convoMessageTo,
        firstMessageType
      } = input;

      const message: tiptapVue3.JSONContent = parse(messageString);
      let convoParticipantToPublicId: TypeId<'convoParticipants'>;
      let convoMessageToNewContactPublicId: TypeId<'contacts'>;

      type IdPair = {
        id: number;
        publicId: string;
        emailIdentityId: number | null;
      };
      type IdPairOrgMembers = {
        id: number;
        publicId: TypeId<'orgMembers'>;
        emailIdentityId: number | null;
      };
      const orgMemberIds: IdPairOrgMembers[] = [];
      const orgMemberPublicIdsForNotifications: TypeId<'orgMembers'>[] = [];
      const orgGroupIds: IdPair[] = [];
      const orgContactIds: IdPair[] = [];
      const orgContactReputationIds: number[] = [];

      // get the authors publicId for the notifications
      const authorOrgMemberObject = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, accountOrgMemberId),
        columns: {
          publicId: true
        }
      });
      if (!authorOrgMemberObject) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'account is not a member of the organization'
        });
      }
      orgMemberPublicIdsForNotifications.push(authorOrgMemberObject.publicId);

      // validate the publicIds of Users and get the IDs
      if (
        participantsOrgMembersPublicIds &&
        participantsOrgMembersPublicIds.length
      ) {
        const orgMemberResponses = await db.query.orgMembers.findMany({
          where: and(
            eq(orgMembers.orgId, orgId),
            inArray(orgMembers.publicId, participantsOrgMembersPublicIds)
          ),
          columns: {
            id: true,
            publicId: true
          },
          with: {
            authorizedEmailIdentities: {
              columns: {
                id: true,
                default: true
              },
              with: {
                emailIdentity: {
                  columns: {
                    id: true
                  }
                }
              }
            }
          }
        });

        for (const orgMember of orgMemberResponses) {
          let emailIdentityId = orgMember.authorizedEmailIdentities.find(
            (emailIdentity) => emailIdentity.default
          )?.emailIdentity.id;

          if (!emailIdentityId) {
            emailIdentityId =
              orgMember.authorizedEmailIdentities[0]?.emailIdentity.id;
          }
          const orgMemberIdObject: IdPairOrgMembers = {
            id: orgMember.id,
            publicId: orgMember.publicId,
            emailIdentityId: emailIdentityId || null
          };
          orgMemberIds.push(orgMemberIdObject);
        }

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
          where: and(
            eq(groups.orgId, orgId),
            inArray(groups.publicId, participantsGroupsPublicIds)
          ),
          columns: {
            id: true,
            publicId: true
          },
          with: {
            authorizedEmailIdentities: {
              columns: {
                id: true,
                default: true
              },
              with: {
                emailIdentity: {
                  columns: {
                    id: true
                  }
                }
              }
            }
          }
        });

        for (const group of groupResponses) {
          let emailIdentityId = group.authorizedEmailIdentities.find(
            (emailIdentity) => emailIdentity.default
          )?.emailIdentity.id;

          if (!emailIdentityId) {
            emailIdentityId =
              group.authorizedEmailIdentities[0]?.emailIdentity.id;
          }
          const groupObject: IdPair = {
            id: group.id,
            publicId: group.publicId,
            emailIdentityId: emailIdentityId || null
          };
          orgGroupIds.push(groupObject);
        }

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
        participantsContactsPublicIds.length > 0
      ) {
        const contactResponses = await db.query.contacts.findMany({
          where: and(
            eq(contacts.orgId, orgId),
            inArray(contacts.publicId, participantsContactsPublicIds)
          ),
          columns: {
            id: true,
            publicId: true
          }
        });

        orgContactIds.push(
          ...contactResponses.map((contact) => ({
            ...contact,
            emailIdentityId: null
          }))
        );

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
              reputationId: true,
              publicId: true,
              emailUsername: true,
              emailDomain: true
            }
          });

          if (existingContact) {
            if (
              convoMessageTo.type === 'email' &&
              convoMessageTo.emailAddress &&
              convoMessageTo.emailAddress === email
            ) {
              convoMessageToNewContactPublicId = existingContact.publicId;
            }
            orgContactIds.push({
              id: existingContact.id,
              publicId: existingContact.publicId,
              emailIdentityId: null
            });
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

              if (
                convoMessageTo.type === 'email' &&
                convoMessageTo.emailAddress &&
                convoMessageTo.emailAddress ===
                  `${emailUsername}@${emailDomain}`
              ) {
                convoMessageToNewContactPublicId = newContactPublicId;
              }
              orgContactIds.push({
                id: Number(newContactInsertResponse.insertId),
                publicId: newContactPublicId,
                emailIdentityId: null
              });
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
                  reputationId: Number(
                    newContactGlobalReputationInsertResponse.insertId
                  ),
                  emailUsername: emailUsername,
                  emailDomain: emailDomain,
                  screenerStatus: 'approve'
                });

              if (
                convoMessageTo.type === 'email' &&
                convoMessageTo.emailAddress &&
                convoMessageTo.emailAddress ===
                  `${emailUsername}@${emailDomain}`
              ) {
                convoMessageToNewContactPublicId = newContactPublicId;
              }
              orgContactIds.push({
                id: Number(newContactInsertResponse.insertId),
                publicId: newContactPublicId,
                emailIdentityId: null
              });
              orgContactReputationIds.push(
                Number(newContactGlobalReputationInsertResponse.insertId)
              );
            }
          }
        }
      }

      // create the conversation get id
      const newConvoPublicId = typeIdGenerator('convos');
      const newConvoTimestamp = new Date();
      const insertConvoResponse = await db.insert(convos).values({
        publicId: newConvoPublicId,
        orgId: orgId,
        lastUpdatedAt: newConvoTimestamp
      });

      // create conversationSubject entry
      const newConvoSubjectPublicId = typeIdGenerator('convoSubjects');
      const insertConvoSubjectResponse = await db.insert(convoSubjects).values({
        orgId: orgId,
        convoId: Number(insertConvoResponse.insertId),
        publicId: newConvoSubjectPublicId,
        subject: topic
      });

      //* create conversationParticipants Entries
      if (orgMemberIds.length) {
        const convoParticipantsDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgMemberIds.forEach((orgMemberId) => {
          const convoMemberPublicId = typeIdGenerator('convoParticipants');

          if (
            convoMessageTo.type === 'orgMember' &&
            convoMessageTo.publicId === orgMemberId.publicId
          ) {
            convoParticipantToPublicId = convoMemberPublicId;
          }

          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: Number(insertConvoResponse.insertId),
            publicId: convoMemberPublicId,
            orgMemberId: orgMemberId.id,
            emailIdentityId: orgMemberId.emailIdentityId
          });
          orgMemberPublicIdsForNotifications.push(orgMemberId.publicId);
        });
        await db
          .insert(convoParticipants)
          .values(convoParticipantsDbInsertValuesArray);
      }

      if (orgGroupIds.length) {
        for (const groupId of orgGroupIds) {
          // add the group to the convo participants
          const convoGroupPublicId = typeIdGenerator('convoParticipants');

          if (
            convoMessageTo.type === 'group' &&
            convoMessageTo.publicId === groupId.publicId
          ) {
            convoParticipantToPublicId = convoGroupPublicId;
          }

          const insertConvoParticipantGroupResponse = await db
            .insert(convoParticipants)
            .values({
              orgId: orgId,
              convoId: Number(insertConvoResponse.insertId),
              publicId: convoGroupPublicId,
              groupId: groupId.id,
              emailIdentityId: groupId.emailIdentityId
            });

          //get the groups members and add to convo separately
          const groupMembersQuery = await db.query.groupMembers.findMany({
            where: eq(groupMembers.groupId, groupId.id),
            columns: {
              orgMemberId: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              }
            }
          });
          if (groupMembersQuery.length > 0) {
            for (const groupMember of groupMembersQuery) {
              const convoParticipantGroupMemberPublicId =
                typeIdGenerator('convoParticipants');
              let convoParticipantId: number | undefined;
              try {
                const insertConvoParticipantResponse = await db
                  .insert(convoParticipants)
                  .values({
                    orgId: orgId,
                    publicId: convoParticipantGroupMemberPublicId,
                    convoId: Number(insertConvoResponse.insertId),
                    orgMemberId: groupMember.orgMemberId,
                    role: 'groupMember',
                    notifications: 'active',
                    emailIdentityId: groupId.emailIdentityId
                  });
                if (insertConvoParticipantResponse) {
                  convoParticipantId = Number(
                    insertConvoParticipantResponse.insertId
                  );
                }
              } catch (retry) {
                const existingConvoParticipant =
                  await db.query.convoParticipants.findFirst({
                    columns: {
                      id: true
                    },
                    where: and(
                      eq(
                        convoParticipants.convoId,
                        Number(insertConvoResponse.insertId)
                      ),
                      eq(convoParticipants.orgMemberId, groupMember.orgMemberId)
                    )
                  });
                if (existingConvoParticipant) {
                  convoParticipantId = Number(existingConvoParticipant.id);
                }
              }
              if (convoParticipantId) {
                await db.insert(convoParticipantGroupMembers).values({
                  convoParticipantId: Number(convoParticipantId),
                  groupId: Number(insertConvoParticipantGroupResponse.insertId),
                  orgId: orgId
                });
              }
              orgMemberPublicIdsForNotifications.push(
                groupMember.orgMember.publicId
              );
            }
          }
        }
      }

      if (orgContactIds.length) {
        const convoParticipantsDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgContactIds.forEach((contactId) => {
          const convoContactPublicId = typeIdGenerator('convoParticipants');

          if (
            (convoMessageTo.type === 'contact' &&
              convoMessageTo.publicId === contactId.publicId) ||
            convoMessageToNewContactPublicId === contactId.publicId
          ) {
            convoParticipantToPublicId = convoContactPublicId;
          }

          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: Number(insertConvoResponse.insertId),
            publicId: convoContactPublicId,
            contactId: contactId.id
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoParticipantsDbInsertValuesArray);
      }

      let authorEmailIdentityId: number | null = null;
      if (sendAsEmailIdentityPublicId) {
        const emailIdentityResponse = await db.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.orgId, orgId),
            eq(emailIdentities.publicId, sendAsEmailIdentityPublicId)
          ),
          columns: {
            id: true,
            publicId: true
          }
        });
        if (emailIdentityResponse) {
          authorEmailIdentityId = emailIdentityResponse.id;
        }
      }

      const authorConvoParticipantPublicId =
        typeIdGenerator('convoParticipants');
      const insertAuthorConvoParticipantResponse = await db
        .insert(convoParticipants)
        .values({
          orgId: orgId,
          convoId: Number(insertConvoResponse.insertId),
          publicId: authorConvoParticipantPublicId,
          orgMemberId: accountOrgMemberId,
          emailIdentityId: authorEmailIdentityId,
          role: 'assigned'
        });

      //* create convoEntry
      const newConvoBody = message;
      const newConvoBodyPlainText = tiptapCore.generateText(
        newConvoBody,
        tipTapExtensions
      );

      const newConvoEntryPublicId = typeIdGenerator('convoEntries');
      const insertConvoEntryResponse = await db.insert(convoEntries).values({
        orgId: orgId,
        publicId: newConvoEntryPublicId,
        convoId: Number(insertConvoResponse.insertId),
        author: Number(insertAuthorConvoParticipantResponse.insertId),
        visibility: 'all_participants',
        subjectId: Number(insertConvoSubjectResponse.insertId),
        type: input.firstMessageType,
        body: newConvoBody,
        bodyPlainText: newConvoBodyPlainText,
        createdAt: newConvoTimestamp
      });

      await db
        .insert(convoSeenTimestamps)
        .values({
          orgId: orgId,
          convoId: Number(insertConvoResponse.insertId),
          participantId: Number(insertAuthorConvoParticipantResponse.insertId),
          orgMemberId: accountOrgMemberId,
          seenAt: newConvoTimestamp
        })
        .onDuplicateKeyUpdate({ set: { seenAt: newConvoTimestamp } });
      await db
        .insert(convoEntrySeenTimestamps)
        .values({
          orgId: orgId,
          convoEntryId: Number(insertConvoEntryResponse.insertId),
          participantId: Number(insertAuthorConvoParticipantResponse.insertId),
          orgMemberId: accountOrgMemberId,
          seenAt: newConvoTimestamp
        })
        .onDuplicateKeyUpdate({ set: { seenAt: newConvoTimestamp } });

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
            convoId: Number(insertConvoResponse.insertId),
            convoEntryId: Number(insertConvoEntryResponse.insertId),
            convoParticipantId: Number(
              insertAuthorConvoParticipantResponse.insertId
            ),
            publicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            type: attachment.type,
            size: attachment.size,
            createdAt: newConvoTimestamp
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
      }

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

      //* if convo has contacts, send external email via mail bridge
      const convoHasEmailParticipants = orgContactIds.length > 0;

      if (convoHasEmailParticipants && firstMessageType === 'message') {
        mailBridgeTrpcClient.mail.send.sendConvoEntryEmail.mutate({
          convoId: Number(insertConvoResponse.insertId),
          entryId: Number(insertConvoEntryResponse.insertId),
          sendAsEmailIdentityPublicId: sendAsEmailIdentityPublicId || '',
          newConvoToParticipantPublicId: convoParticipantToPublicId!,
          orgId: orgId
        });
      }

      realtime.emit({
        orgMemberPublicIds: orgMemberPublicIdsForNotifications,
        event: 'convo:new',
        data: { publicId: newConvoPublicId }
      });

      return {
        status: 'success',
        publicId: newConvoPublicId
      };
    }),

  //* reply to a conversation
  replyToConvo: orgProcedure
    .input(
      z.object({
        sendAsEmailIdentityPublicId:
          typeIdValidator('emailIdentities').optional(),
        replyToMessagePublicId: typeIdValidator('convoEntries'),
        message: z.string().min(1),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            attachmentPublicId: typeIdValidator('convoAttachments'),
            size: z.number(),
            type: z.string()
          })
        ),
        messageType: z.enum(['message', 'draft', 'comment'])
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
        message: messageString,
        messageType
      } = input;

      const message: tiptapVue3.JSONContent = parse(messageString);

      const convoEntryToReplyToQueryResponse =
        await db.query.convoEntries.findFirst({
          where: and(
            eq(convoEntries.orgId, orgId),
            eq(convoEntries.publicId, input.replyToMessagePublicId)
          ),
          columns: {
            id: true,
            orgId: true,
            convoId: true,
            metadata: true,
            emailMessageId: true,
            type: true,
            subjectId: true
          },
          with: {
            convo: {
              columns: {
                id: true,
                publicId: true
              },
              with: {
                participants: {
                  columns: {
                    id: true,
                    publicId: true,
                    orgMemberId: true,
                    groupId: true,
                    contactId: true,
                    emailIdentityId: true,
                    role: true
                  }
                }
              }
            }
          }
        });

      if (!convoEntryToReplyToQueryResponse) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Reply to message not found'
        });
      }
      if (Number(convoEntryToReplyToQueryResponse.orgId) !== orgId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Reply to message not found'
        });
      }

      // get the email identity the user wants to email from
      let emailIdentityId: number | null = null;

      if (sendAsEmailIdentityPublicId) {
        const sendAsEmailIdentityResponse =
          await db.query.emailIdentities.findFirst({
            where: and(
              eq(emailIdentities.orgId, orgId),
              eq(emailIdentities.publicId, sendAsEmailIdentityPublicId)
            ),
            columns: {
              id: true
            },
            with: {
              authorizedOrgMembers: {
                columns: {
                  orgMemberId: true,
                  groupId: true
                },
                with: {
                  group: {
                    columns: {
                      id: true
                    },
                    with: {
                      members: {
                        columns: {
                          orgMemberId: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });
        const userIsAuthorized =
          sendAsEmailIdentityResponse?.authorizedOrgMembers.some(
            (authorizedOrgMember) =>
              authorizedOrgMember.orgMemberId === accountOrgMemberId ||
              authorizedOrgMember.group?.members.some(
                (groupMember) => groupMember.orgMemberId === accountOrgMemberId
              )
          );
        if (!userIsAuthorized) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User is not authorized to send as this email identity'
          });
        }
        emailIdentityId = sendAsEmailIdentityResponse?.id || null;
      }

      let authorConvoParticipantId: number | undefined;
      authorConvoParticipantId =
        convoEntryToReplyToQueryResponse?.convo.participants.find(
          (participant) => participant.orgMemberId === accountOrgMemberId
        )?.id;
      // if we cant find the orgMembers participant id, we assume they're a part of the convo as a group member and we're somehow skipped accidentally, so now we add them as a dedicated participant
      if (!authorConvoParticipantId) {
        const newConvoParticipantInsertResponse = await db
          .insert(convoParticipants)
          .values({
            convoId: convoEntryToReplyToQueryResponse.convoId,
            orgId: orgId,
            publicId: typeIdGenerator('convoParticipants'),
            orgMemberId: accountOrgMemberId,
            emailIdentityId: emailIdentityId,
            role: 'contributor'
          });
        authorConvoParticipantId = Number(
          newConvoParticipantInsertResponse.insertId
        );
      } else {
        const isParticipantEmailIdentityIdNotEqualToSendAsEmailIdentityId =
          convoEntryToReplyToQueryResponse.convo.participants.find(
            (participant) => participant.id === authorConvoParticipantId
          )?.emailIdentityId !== emailIdentityId;
        if (
          isParticipantEmailIdentityIdNotEqualToSendAsEmailIdentityId &&
          messageType === 'message'
        ) {
          await db
            .update(convoParticipants)
            .set({
              emailIdentityId: emailIdentityId
            })
            .where(eq(convoParticipants.id, authorConvoParticipantId));
        }
      }

      // check if any of the convo participants have a contactId
      const convoHasContactParticipants =
        convoEntryToReplyToQueryResponse.convo.participants.some(
          (participant) => participant.contactId !== null
        );
      // create convoEntry

      const newConvoEntryBody = message;
      const newConvoEntryBodyPlainText = tiptapCore.generateText(
        newConvoEntryBody,
        tipTapExtensions
      );

      const newConvoEntryPublicId = typeIdGenerator('convoEntries');
      const newConvoEntryTimestamp = new Date();
      const insertConvoEntryResponse = await db.insert(convoEntries).values({
        orgId: orgId,
        publicId: newConvoEntryPublicId,
        convoId: Number(convoEntryToReplyToQueryResponse.convoId),
        author: Number(authorConvoParticipantId),
        visibility: 'all_participants',
        subjectId:
          convoEntryToReplyToQueryResponse.subjectId !== null
            ? Number(convoEntryToReplyToQueryResponse.subjectId)
            : null,
        type: messageType,
        body: newConvoEntryBody,
        bodyPlainText: newConvoEntryBodyPlainText,
        replyToId: Number(convoEntryToReplyToQueryResponse.id),
        createdAt: newConvoEntryTimestamp
      });

      await db
        .update(convos)
        .set({
          lastUpdatedAt: newConvoEntryTimestamp
        })
        .where(eq(convos.id, Number(convoEntryToReplyToQueryResponse.convoId)));

      await db.insert(convoEntryReplies).values({
        entrySourceId: Number(convoEntryToReplyToQueryResponse.id),
        entryReplyId: Number(insertConvoEntryResponse.insertId),
        orgId: orgId
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
            convoId: Number(convoEntryToReplyToQueryResponse.convoId),
            convoEntryId: Number(insertConvoEntryResponse.insertId),
            convoParticipantId: Number(authorConvoParticipantId),
            publicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            type: attachment.type,
            size: attachment.size,
            createdAt: newConvoEntryTimestamp
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

        // insertedAttachmentIds = Number(insertAttachmentsResponse.insertId;
      }
      if (
        input.attachments.length > 0 &&
        pendingAttachmentsToRemoveFromPending.length > 0
      ) {
        db.delete(pendingAttachments).where(
          inArray(
            pendingAttachments.publicId,
            pendingAttachmentsToRemoveFromPending
          )
        );
      }

      //* send notifications
      sendRealtimeNotification({
        newConvo: false,
        convoId: Number(convoEntryToReplyToQueryResponse.convoId),
        convoEntryId: Number(insertConvoEntryResponse.insertId)
      });

      //* if convo has contacts, send external email via mail bridge

      if (
        convoHasContactParticipants &&
        sendAsEmailIdentityPublicId &&
        messageType === 'message'
      ) {
        mailBridgeTrpcClient.mail.send.sendConvoEntryEmail.mutate({
          convoId: Number(convoEntryToReplyToQueryResponse.convoId),
          entryId: Number(insertConvoEntryResponse.insertId),
          sendAsEmailIdentityPublicId: sendAsEmailIdentityPublicId,
          orgId: orgId
        });
      }

      await db
        .insert(convoSeenTimestamps)
        .values({
          orgId: orgId,
          convoId: Number(convoEntryToReplyToQueryResponse.convo.id),
          participantId: Number(authorConvoParticipantId),
          orgMemberId: accountOrgMemberId,
          seenAt: new Date()
        })
        .onDuplicateKeyUpdate({ set: { seenAt: new Date() } });
      await db
        .insert(convoEntrySeenTimestamps)
        .values({
          orgId: orgId,
          convoEntryId: Number(insertConvoEntryResponse.insertId),
          participantId: Number(authorConvoParticipantId),
          orgMemberId: accountOrgMemberId,
          seenAt: new Date()
        })
        .onDuplicateKeyUpdate({ set: { seenAt: new Date() } });
      return {
        status: 'success',
        publicId: newConvoEntryPublicId
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
              emailIdentity: {
                columns: {
                  publicId: true
                }
              },
              orgMember: {
                columns: {
                  id: true,
                  publicId: true
                },
                with: {
                  profile: {
                    columns: {
                      avatarTimestamp: true,
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
                  avatarTimestamp: true,
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
                  avatarTimestamp: true,
                  publicId: true,
                  name: true,
                  emailUsername: true,
                  emailDomain: true,
                  setName: true,
                  signaturePlainText: true,
                  signatureHtml: true,
                  type: true
                }
              }
            }
          },
          attachments: {
            columns: {
              publicId: true,
              fileName: true,
              type: true,
              inline: true
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
        ownParticipantPublicId: participantPublicId
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

  getOrgMemberConvos: orgProcedure
    .input(
      z.object({
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: typeIdValidator('convos').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { cursorLastUpdatedAt, cursorLastPublicId } = input;
      const orgId = org.id;

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
              eq(convos.orgId, orgId),
              eq(convos.lastUpdatedAt, inputLastUpdatedAt),
              lt(convos.publicId, inputLastPublicId)
            ),
            and(
              eq(convos.orgId, orgId),
              lt(convos.lastUpdatedAt, inputLastUpdatedAt)
            )
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
                      avatarTimestamp: true,
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
                  avatarTimestamp: true
                }
              },
              contact: {
                columns: {
                  publicId: true,
                  name: true,
                  avatarTimestamp: true,
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
                          avatarTimestamp: true,
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
                      avatarTimestamp: true
                    }
                  },
                  contact: {
                    columns: {
                      publicId: true,
                      name: true,
                      avatarTimestamp: true,
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
          data: <typeof convoQuery>[],
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
    }),
  getOrgMemberSpecificConvo: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { convoPublicId } = input;

      const convoQuery = await db.query.convos.findFirst({
        columns: {
          publicId: true,
          lastUpdatedAt: true
        },
        where: and(
          eq(convos.publicId, convoPublicId),
          eq(convos.orgId, org.id)
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
                      avatarTimestamp: true,
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
                  avatarTimestamp: true
                }
              },
              contact: {
                columns: {
                  publicId: true,
                  name: true,
                  avatarTimestamp: true,
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
                          avatarTimestamp: true,
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
                      avatarTimestamp: true
                    }
                  },
                  contact: {
                    columns: {
                      publicId: true,
                      name: true,
                      avatarTimestamp: true,
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

      if (!convoQuery || !convoQuery?.publicId) {
        return null;
      }

      return convoQuery;
    })
});
