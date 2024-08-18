import {
  convos,
  convoParticipants,
  convoSubjects,
  teams,
  orgMembers,
  contacts,
  contactGlobalReputations,
  convoEntries,
  teamMembers,
  convoAttachments,
  pendingAttachments,
  convoEntryReplies,
  convoSeenTimestamps,
  convoEntrySeenTimestamps,
  convoParticipantTeamMembers,
  emailIdentities,
  convoEntryPrivateVisibilityParticipants,
  convoEntryRawHtmlEmails,
  spaces,
  convoToSpaces
} from '@u22n/database/schema';
import {
  type InferInsertModel,
  and,
  eq,
  inArray,
  desc,
  or
} from '@u22n/database/orm';
import {
  tryParseInlineProxyUrl,
  walkAndReplaceImages
} from '~platform/utils/tiptap-utils';
import {
  typeIdValidator,
  type TypeId,
  typeIdGenerator
} from '@u22n/utils/typeid';
import { realtime, sendRealtimeNotification } from '~platform/utils/realtime';
import { mailBridgeTrpcClient } from '~platform/utils/tRPCServerClients';
import { isOrgMemberSpaceMember } from '../spaceRouter/utils';
import { createExtensionSet } from '@u22n/tiptap/extensions';
import { router, orgProcedure } from '~platform/trpc/trpc';
import { type JSONContent } from '@u22n/tiptap/react';
import { convoEntryRouter } from './entryRouter';
import { tiptapCore } from '@u22n/tiptap';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { z } from 'zod';

const tipTapExtensions = createExtensionSet({
  storageUrl: env.STORAGE_URL
});

type Attachment = {
  orgPublicId: TypeId<'org'>;
  attachmentPublicId: TypeId<'convoAttachments'>;
  fileName: string;
  fileType: string;
  size: number;
  inline?: boolean;
};

export const convoRouter = router({
  entries: convoEntryRouter,
  createNewConvo: orgProcedure
    .input(
      z.object({
        participantsOrgMembersPublicIds: z.array(typeIdValidator('orgMembers')),
        participantsTeamsPublicIds: z.array(typeIdValidator('teams')),
        participantsContactsPublicIds: z.array(typeIdValidator('contacts')),
        participantsEmails: z.array(z.string()),
        sendAsEmailIdentityPublicId:
          typeIdValidator('emailIdentities').optional(),
        to: z
          .object({
            type: z.enum(['orgMember', 'team', 'contact']),
            publicId: typeIdValidator('orgMembers')
              .or(typeIdValidator('teams'))
              .or(typeIdValidator('contacts'))
          })
          .or(
            z.object({
              type: z.enum(['email']),
              emailAddress: z.string().min(3)
            })
          ),
        topic: z.string().min(1),
        message: z.any(),
        firstMessageType: z.enum(['message', 'draft', 'comment']),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            attachmentPublicId: typeIdValidator('convoAttachments'),
            size: z.number(),
            type: z.string()
          })
        ),
        hide: z.boolean().default(false),
        spaceShortcode: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const accountOrgMemberId = org.memberId;
      const orgId = org.id;

      const {
        sendAsEmailIdentityPublicId,
        participantsEmails,
        participantsOrgMembersPublicIds,
        participantsTeamsPublicIds,
        participantsContactsPublicIds,
        topic,
        to: convoMessageTo,
        firstMessageType,
        spaceShortcode
      } = input;

      const message = input.message as JSONContent;

      // if there is a send as email identity, check if that email identity is enabled
      if (sendAsEmailIdentityPublicId) {
        const emailIdentityResponse = await db.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.orgId, orgId),
            eq(emailIdentities.publicId, sendAsEmailIdentityPublicId)
          ),
          columns: {},
          with: {
            domain: {
              columns: {
                domainStatus: true,
                sendingMode: true
              }
            }
          }
        });

        if (!emailIdentityResponse) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Send as email identity not found'
          });
        }

        if (emailIdentityResponse.domain) {
          if (
            emailIdentityResponse.domain.domainStatus !== 'active' ||
            emailIdentityResponse.domain.sendingMode === 'disabled'
          ) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message:
                'You cant send from that email address due to a configuration issue. Please contact your administrator or select a different email identity.'
            });
          }
        }
      }

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (
        spaceMembershipResponse.type !== 'open' &&
        spaceMembershipResponse.role === null
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not allowed to send a message in this space'
        });
      }
      const spacesToAddConvoTo: number[] = [];

      spacesToAddConvoTo.push(spaceMembershipResponse.spaceId);

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
      const orgTeamIds: IdPair[] = [];
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
      if (participantsOrgMembersPublicIds?.length) {
        const orgMemberResponses = await db.query.orgMembers.findMany({
          where: and(
            eq(orgMembers.orgId, orgId),
            inArray(orgMembers.publicId, participantsOrgMembersPublicIds)
          ),
          columns: {
            id: true,
            publicId: true,
            defaultEmailIdentityId: true
          }
        });

        for (const orgMemberParticipant of orgMemberResponses) {
          orgMemberIds.push({
            id: orgMemberParticipant.id,
            publicId: orgMemberParticipant.publicId,
            emailIdentityId: orgMemberParticipant.defaultEmailIdentityId ?? null
          });

          const canUserAccessSpace = await isOrgMemberSpaceMember({
            db,
            orgId,
            spaceShortcode: input.spaceShortcode,
            orgMemberId: orgMemberParticipant.id
          });

          if (
            canUserAccessSpace.role === null &&
            canUserAccessSpace.type !== 'open'
          ) {
            const orgMemberQueryResponse = await db.query.orgMembers.findFirst({
              where: and(
                eq(orgMembers.orgId, orgId),
                eq(orgMembers.id, orgMemberParticipant.id)
              ),
              columns: {
                personalSpaceId: true
              }
            });

            orgMemberQueryResponse?.personalSpaceId &&
              spacesToAddConvoTo.push(orgMemberQueryResponse.personalSpaceId);
          }
        }

        if (orgMemberIds.length !== participantsOrgMembersPublicIds.length) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'One or more users is invalid'
          });
        }
      }

      // validate the publicIds of Teams and get the IDs
      if (participantsTeamsPublicIds?.length) {
        const teamResponses = await db.query.teams.findMany({
          where: and(
            eq(teams.orgId, orgId),
            inArray(teams.publicId, participantsTeamsPublicIds)
          ),
          columns: {
            id: true,
            publicId: true,
            defaultEmailIdentityId: true,
            defaultSpaceId: true
          }
        });

        for (const teamParticipant of teamResponses) {
          orgTeamIds.push({
            id: teamParticipant.id,
            publicId: teamParticipant.publicId,
            emailIdentityId: teamParticipant.defaultEmailIdentityId ?? null
          });

          // Check if the team already has access to the space the convo was created in, if yes, dont add the convo to their default space, else, add convo to their default space
          const spaceQueryResponse = await db.query.spaces.findFirst({
            where: and(
              eq(spaces.orgId, orgId),
              eq(spaces.shortcode, spaceShortcode)
            ),
            columns: {
              id: true,
              publicId: true,
              type: true
            },
            with: {
              members: {
                columns: {
                  teamId: true
                }
              }
            }
          });

          if (!spaceQueryResponse) break;

          const spaceMembersWhoAreTeams = spaceQueryResponse?.members.filter(
            (spaceMember) => spaceMember.teamId !== null
          );

          if (
            spaceMembersWhoAreTeams.length === 0 &&
            spaceQueryResponse?.type !== 'open'
          ) {
            const teamQueryResponse = await db.query.teams.findFirst({
              where: and(
                eq(teams.orgId, orgId),
                eq(teams.id, teamParticipant.id)
              ),
              columns: {
                defaultSpaceId: true
              }
            });

            teamQueryResponse?.defaultSpaceId &&
              spacesToAddConvoTo.push(teamQueryResponse.defaultSpaceId);
          }
        }

        if (orgTeamIds.length !== participantsTeamsPublicIds.length) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'One or more teams is invalid'
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

      const convoHasEmailParticipants =
        participantsContactsPublicIds.length > 0 ||
        participantsEmails.length > 0;

      // if there is a send as email identity, check if that email identity is enabled
      if (sendAsEmailIdentityPublicId && convoHasEmailParticipants) {
        const emailIdentityResponse = await db.query.emailIdentities.findFirst({
          where: and(
            eq(emailIdentities.orgId, orgId),
            eq(emailIdentities.publicId, sendAsEmailIdentityPublicId)
          ),
          columns: {},
          with: {
            domain: {
              columns: {
                domainStatus: true,
                sendingMode: true
              }
            }
          }
        });

        if (!emailIdentityResponse) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Send as email identity not found'
          });
        }

        if (emailIdentityResponse.domain) {
          if (
            emailIdentityResponse.domain.domainStatus !== 'active' ||
            emailIdentityResponse.domain.sendingMode === 'disabled'
          ) {
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message:
                'You cant send from that email address due to a configuration issue. Please contact your administrator or select a different email identity.'
            });
          }
        }
      }

      // for each of participantsEmails check if a contact or contact reputation exists. if no reputation create one, if reputation but no org contact create one, if reputation and org contact get ID

      if (participantsEmails?.length) {
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

      // add the conversation to the space

      const convoToSpacesInsertValues = spacesToAddConvoTo.map((spaceId) => ({
        publicId: typeIdGenerator('convoToSpaces'),
        convoId: Number(insertConvoResponse.insertId),
        spaceId: spaceId,
        orgId: orgId
      }));

      await db.insert(convoToSpaces).values(convoToSpacesInsertValues);

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

      if (orgTeamIds.length) {
        for (const teamId of orgTeamIds) {
          // add the team to the convo participants
          const convoTeamPublicId = typeIdGenerator('convoParticipants');

          if (
            convoMessageTo.type === 'team' &&
            convoMessageTo.publicId === teamId.publicId
          ) {
            convoParticipantToPublicId = convoTeamPublicId;
          }

          const insertConvoParticipantTeamResponse = await db
            .insert(convoParticipants)
            .values({
              orgId: orgId,
              convoId: Number(insertConvoResponse.insertId),
              publicId: convoTeamPublicId,
              teamId: teamId.id,
              emailIdentityId: teamId.emailIdentityId
            });

          //get the teams members and add to convo separately
          const teamMembersQuery = await db.query.teamMembers.findMany({
            where: eq(teamMembers.teamId, teamId.id),
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
          if (teamMembersQuery.length > 0) {
            for (const teamMember of teamMembersQuery) {
              const convoParticipantTeamMemberPublicId =
                typeIdGenerator('convoParticipants');
              let convoParticipantId: number | undefined;
              try {
                const insertConvoParticipantResponse = await db
                  .insert(convoParticipants)
                  .values({
                    orgId: orgId,
                    publicId: convoParticipantTeamMemberPublicId,
                    convoId: Number(insertConvoResponse.insertId),
                    orgMemberId: teamMember.orgMemberId,
                    role: 'teamMember',
                    notifications: 'active',
                    emailIdentityId: teamId.emailIdentityId
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
                      eq(convoParticipants.orgMemberId, teamMember.orgMemberId)
                    )
                  });
                if (existingConvoParticipant) {
                  convoParticipantId = Number(existingConvoParticipant.id);
                }
              }
              if (convoParticipantId) {
                await db.insert(convoParticipantTeamMembers).values({
                  convoParticipantId: Number(convoParticipantId),
                  teamId: Number(insertConvoParticipantTeamResponse.insertId),
                  orgId: orgId
                });
              }
              orgMemberPublicIdsForNotifications.push(
                teamMember.orgMember.publicId
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
          hidden: input.hide,
          role: 'assigned'
        });

      const inlineAttachments: Attachment[] = [];

      walkAndReplaceImages(message, (inlineUrl) => {
        const inlineProxy = tryParseInlineProxyUrl(inlineUrl);
        if (!inlineProxy) return inlineUrl;
        inlineAttachments.push({
          orgPublicId: org.publicId,
          attachmentPublicId: inlineProxy.attachmentPublicId,
          fileName: inlineProxy.fileName,
          fileType: inlineProxy.fileType,
          size: inlineProxy.size,
          inline: true
        });
        return `${env.STORAGE_URL}/attachment/${inlineProxy.orgShortcode}/${inlineProxy.attachmentPublicId}/${inlineProxy.fileName}`;
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
      const pendingAttachmentsToRemoveFromPending: TypeId<'convoAttachments'>[] =
        [];
      const convoAttachmentsDbInsertValuesArray: InferInsertModel<
        typeof convoAttachments
      >[] = [];

      if (input.attachments.length > 0) {
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
          pendingAttachmentsToRemoveFromPending.push(
            attachment.attachmentPublicId
          );
        });
      }

      if (inlineAttachments.length > 0) {
        inlineAttachments.forEach((attachment) => {
          convoAttachmentsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: Number(insertConvoResponse.insertId),
            convoEntryId: Number(insertConvoEntryResponse.insertId),
            convoParticipantId: Number(
              insertAuthorConvoParticipantResponse.insertId
            ),
            publicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            type: attachment.fileType,
            size: attachment.size,
            createdAt: newConvoTimestamp,
            inline: true
          });
          pendingAttachmentsToRemoveFromPending.push(
            attachment.attachmentPublicId
          );
        });
      }

      if (convoAttachmentsDbInsertValuesArray.length > 0) {
        await db
          .insert(convoAttachments)
          .values(convoAttachmentsDbInsertValuesArray);
      }

      if (pendingAttachmentsToRemoveFromPending.length > 0) {
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

      if (convoHasEmailParticipants && firstMessageType === 'message') {
        await mailBridgeTrpcClient.mail.send.sendConvoEntryEmail.mutate({
          convoId: Number(insertConvoResponse.insertId),
          entryId: Number(insertConvoEntryResponse.insertId),
          sendAsEmailIdentityPublicId: sendAsEmailIdentityPublicId ?? '',
          newConvoToParticipantPublicId: convoParticipantToPublicId!,
          orgId: orgId
        });
      }

      const spaceShortCodes = await db.query.convoToSpaces
        .findMany({
          where: eq(
            convoToSpaces.convoId,
            Number(insertConvoResponse.insertId)
          ),
          columns: {
            id: true
          },
          with: {
            space: {
              columns: {
                shortcode: true
              }
            }
          }
        })
        .then((spaces) => spaces.map((space) => space.space.shortcode));

      await realtime.emit({
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
        message: z.any(),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            attachmentPublicId: typeIdValidator('convoAttachments'),
            size: z.number(),
            type: z.string(),
            inline: z.boolean().default(false)
          })
        ),
        messageType: z.enum(['message', 'draft', 'comment']),
        hide: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const accountOrgMemberId = org.memberId;
      const orgId = org.id;
      const { sendAsEmailIdentityPublicId, messageType } = input;

      const message = input.message as JSONContent;

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
                    teamId: true,
                    contactId: true,
                    emailIdentityId: true,
                    role: true,
                    hidden: true
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
            }
          });

        //! fix user authorization via spaceId
        // const userIsAuthorized =
        //   sendAsEmailIdentityResponse?.authorizedSenders.some(
        //     (authorizedOrgMember) =>
        //       authorizedOrgMember.orgMemberId === accountOrgMemberId ||
        //       authorizedOrgMember.team?.members.some(
        //         (teamMember) => teamMember.orgMemberId === accountOrgMemberId
        //       )
        //   );
        // if (!userIsAuthorized) {
        //   throw new TRPCError({
        //     code: 'UNAUTHORIZED',
        //     message: 'User is not authorized to send as this email identity'
        //   });
        // }
        emailIdentityId = sendAsEmailIdentityResponse?.id ?? null;
      }

      let authorConvoParticipantId: number | undefined;
      let authorConvoParticipantPublicId:
        | TypeId<'convoParticipants'>
        | undefined;
      authorConvoParticipantId =
        convoEntryToReplyToQueryResponse?.convo.participants.find(
          (participant) => participant.orgMemberId === accountOrgMemberId
        )?.id;
      authorConvoParticipantPublicId =
        convoEntryToReplyToQueryResponse?.convo.participants.find(
          (participant) => participant.orgMemberId === accountOrgMemberId
        )?.publicId;
      // if we cant find the orgMembers participant id, we assume they're a part of the convo as a team member and we're somehow skipped accidentally, so now we add them as a dedicated participant
      if (!authorConvoParticipantId) {
        authorConvoParticipantPublicId = typeIdGenerator('convoParticipants');
        const newConvoParticipantInsertResponse = await db
          .insert(convoParticipants)
          .values({
            convoId: convoEntryToReplyToQueryResponse.convoId,
            orgId: orgId,
            publicId: authorConvoParticipantPublicId,
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

      if (sendAsEmailIdentityPublicId && convoHasContactParticipants) {
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
              authorizedSenders: {
                columns: {
                  orgMemberId: true,
                  teamId: true
                },
                with: {
                  team: {
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
          sendAsEmailIdentityResponse?.authorizedSenders.some(
            (authorizedOrgMember) =>
              authorizedOrgMember.orgMemberId === accountOrgMemberId ||
              authorizedOrgMember.team?.members.some(
                (teamMember) => teamMember.orgMemberId === accountOrgMemberId
              )
          );
        if (!userIsAuthorized) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User is not authorized to send as this email identity'
          });
        }
        emailIdentityId = sendAsEmailIdentityResponse?.id ?? null;
      }

      const inlineAttachments: Attachment[] = [];

      walkAndReplaceImages(message, (inlineUrl) => {
        const inlineProxy = tryParseInlineProxyUrl(inlineUrl);
        if (!inlineProxy) return inlineUrl;
        inlineAttachments.push({
          orgPublicId: org.publicId,
          attachmentPublicId: inlineProxy.attachmentPublicId,
          fileName: inlineProxy.fileName,
          fileType: inlineProxy.fileType,
          size: inlineProxy.size,
          inline: true
        });
        return `${env.STORAGE_URL}/attachment/${inlineProxy.orgShortcode}/${inlineProxy.attachmentPublicId}/${inlineProxy.fileName}`;
      });

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
      const convoAttachmentsDbInsertValuesArray: InferInsertModel<
        typeof convoAttachments
      >[] = [];
      const pendingAttachmentsToRemoveFromPending: TypeId<'convoAttachments'>[] =
        [];

      if (input.attachments.length > 0) {
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
            createdAt: newConvoEntryTimestamp,
            inline: true
          });

          pendingAttachmentsToRemoveFromPending.push(
            attachment.attachmentPublicId
          );
        });
      }

      if (inlineAttachments.length > 0) {
        inlineAttachments.forEach((attachment) => {
          convoAttachmentsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: Number(convoEntryToReplyToQueryResponse.convoId),
            convoEntryId: Number(insertConvoEntryResponse.insertId),
            convoParticipantId: Number(authorConvoParticipantId),
            publicId: attachment.attachmentPublicId,
            fileName: attachment.fileName,
            type: attachment.fileType,
            size: attachment.size,
            createdAt: newConvoEntryTimestamp,
            inline: true
          });
          pendingAttachmentsToRemoveFromPending.push(
            attachment.attachmentPublicId
          );
        });
      }

      if (convoAttachmentsDbInsertValuesArray.length > 0) {
        await db
          .insert(convoAttachments)
          .values(convoAttachmentsDbInsertValuesArray);
      }

      if (pendingAttachmentsToRemoveFromPending.length > 0) {
        await db
          .delete(pendingAttachments)
          .where(
            inArray(
              pendingAttachments.publicId,
              pendingAttachmentsToRemoveFromPending
            )
          );
      }

      //* if convo has contacts, send external email via mail bridge

      if (
        convoHasContactParticipants &&
        sendAsEmailIdentityPublicId &&
        messageType === 'message'
      ) {
        await mailBridgeTrpcClient.mail.send.sendConvoEntryEmail.mutate({
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

      if (input.hide) {
        await db
          .update(convoParticipants)
          .set({
            hidden: true
          })
          .where(eq(convoParticipants.id, authorConvoParticipantId));
      }

      //* send notifications
      await sendRealtimeNotification({
        newConvo: false,
        convoId: Number(convoEntryToReplyToQueryResponse.convoId),
        convoEntryId: Number(insertConvoEntryResponse.insertId)
      });

      return {
        status: 'success',
        publicId: newConvoEntryPublicId,
        bodyPlainText: newConvoEntryBodyPlainText
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
      const { db, org } = ctx;
      const orgId = org.id;
      const accountOrgMemberId = org.memberId;
      const { convoPublicId } = input;

      // initial low column select to verify convo exists
      // TODO: Add filtering for org based on input.filterOrgPublicId
      const convoDetails = await db.query.convos.findFirst({
        columns: {
          publicId: true,
          lastUpdatedAt: true,
          createdAt: true
        },
        where: and(eq(convos.orgId, orgId), eq(convos.publicId, convoPublicId)),
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
              teamId: true,
              contactId: true,
              lastReadAt: true,
              notifications: true,
              active: true,
              role: true,
              hidden: true
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
              team: {
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
              inline: true,
              createdAt: true
            }
          },
          spaces: {
            columns: {
              publicId: true
            },
            with: {
              space: {
                columns: {
                  shortcode: true
                }
              }
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

      const allSpacesShortcodes = convoDetails.spaces.map(
        (space) => space.space.shortcode
      );
      const orgMemberIsSpaceMember = allSpacesShortcodes.some(
        async (spaceShortcode) => {
          const spaceMembershipResponse = await isOrgMemberSpaceMember({
            db,
            orgId,
            spaceShortcode: spaceShortcode,
            orgMemberId: org.memberId
          });
          if (
            spaceMembershipResponse.type !== 'open' &&
            spaceMembershipResponse.role === null
          ) {
            return false;
          }
          return true;
        }
      );

      if (!orgMemberIsSpaceMember) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to access this conversation'
        });
      }

      // Find the participant.publicId for the accountOrgMemberId
      let ownParticipantPublicId: string | undefined;

      // Check if the user's orgMemberId is in the conversation participants
      convoDetails?.participants.forEach((participant) => {
        if (participant.orgMember?.id === accountOrgMemberId) {
          ownParticipantPublicId = participant.publicId;
        }
      });

      // If not found, check if the user's orgMemberId is in any participant's team members
      if (!ownParticipantPublicId) {
        convoDetails?.participants.forEach((participant) => {
          participant.team?.members.forEach((teamMember) => {
            if (teamMember.orgMemberId === accountOrgMemberId) {
              ownParticipantPublicId = participant.publicId;
            }
          });
        });
      }

      // strip the user IDs from the response
      convoDetails.participants.forEach((participant) => {
        if (participant.orgMember?.id) participant.orgMember.id = 0;
        participant.team?.members.forEach((teamMember) => {
          if (teamMember.orgMemberId) teamMember.orgMemberId = 0;
        });
      });

      // updates the lastReadAt of the participant
      if (ownParticipantPublicId) {
        await db
          .update(convoParticipants)
          .set({
            lastReadAt: new Date()
          })
          .where(
            eq(
              convoParticipants.publicId,
              ownParticipantPublicId as `cp_${string}`
            )
          );
      }

      return {
        data: convoDetails,
        ownParticipantPublicId: ownParticipantPublicId ?? null
      };
    }),

  // used for data store
  getOrgMemberSpecificConvo: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { convoPublicId } = input;
      const accountOrgMemberId = org.memberId;

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
              publicId: true,
              hidden: true,
              notifications: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true,
                  id: true
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
              team: {
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
                columns: {
                  publicId: true
                },
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
                  team: {
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

      if (!convoQuery?.publicId) {
        return null;
      }

      const participant = convoQuery?.participants.find((participant) => {
        return participant.orgMember?.id === accountOrgMemberId;
      });

      // If participant is still not found, the user is not a participant of this conversation
      // if (!participant) {
      //   throw new TRPCError({
      //     code: 'UNAUTHORIZED',
      //     message: 'You are not a participant of this conversation'
      //   });
      // }

      // updates the lastReadAt of the participant
      if (participant) {
        await db
          .update(convoParticipants)
          .set({
            lastReadAt: new Date()
          })
          .where(eq(convoParticipants.publicId, participant.publicId));
      }

      return convoQuery;
    }),
  hideConvo: orgProcedure
    .input(
      z.object({
        convoPublicId: z
          .array(typeIdValidator('convos'))
          .or(typeIdValidator('convos')),
        unhide: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const { convoPublicId } = input;
      const orgMemberId = org.memberId;
      const convoPublicIds = Array.isArray(convoPublicId)
        ? convoPublicId
        : [convoPublicId];

      const convosQuery = await db.query.convos.findMany({
        columns: {
          id: true
        },
        where: and(
          inArray(convos.publicId, convoPublicIds),
          eq(convos.orgId, org.id)
        ),
        with: {
          participants: {
            columns: {
              id: true
            },
            where: eq(convoParticipants.orgMemberId, orgMemberId),
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              }
            }
          }
        }
      });

      if (convosQuery.length !== convoPublicIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more conversations not found'
        });
      }

      const orgMemberConvoParticipants = convosQuery
        .map((convo) => convo.participants[0])
        .filter((participant) => typeof participant !== 'undefined');

      if (orgMemberConvoParticipants.length !== convoPublicIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more conversations not found'
        });
      }

      await db
        .update(convoParticipants)
        .set({
          hidden: !input.unhide
        })
        .where(
          inArray(
            convoParticipants.id,
            orgMemberConvoParticipants.map((p) => p.id)
          )
        );

      const orgMemberPublicIdsForNotifications = Array.from(
        new Set(orgMemberConvoParticipants.map((p) => p.orgMember!.publicId))
      );

      const spaceShortCodes = await db.query.convoToSpaces
        .findMany({
          where: inArray(
            convoToSpaces.convoId,
            convosQuery.map((convo) => convo.id)
          ),
          columns: {
            id: true
          },
          with: {
            space: {
              columns: {
                shortcode: true
              }
            }
          }
        })
        .then((spaces) => spaces.map((space) => space.space.shortcode));

      await realtime.emit({
        orgMemberPublicIds: orgMemberPublicIdsForNotifications,
        event: 'convo:hidden',
        data: {
          publicId: convoPublicIds,
          hidden: !input.unhide
        }
      });

      return { success: true };
    }),
  deleteConvo: orgProcedure
    .input(
      z.object({
        convoPublicId: z
          .array(typeIdValidator('convos'))
          .or(typeIdValidator('convos'))
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const accountOrgMemberId = org.memberId;
      const orgId = org.id;
      const orgPublicId = org.publicId;
      const { convoPublicId } = input;
      const convoPublicIds = Array.isArray(convoPublicId)
        ? convoPublicId
        : [convoPublicId];

      const convoQueryResponses = await db.query.convos.findMany({
        where: and(
          inArray(convos.publicId, convoPublicIds),
          eq(convos.orgId, orgId)
        ),
        columns: {
          id: true,
          orgId: true
        },
        with: {
          participants: {
            columns: {
              id: true,
              orgMemberId: true,
              teamId: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              },
              team: {
                columns: {},
                with: {
                  members: {
                    columns: {
                      orgMemberId: true
                    }
                  }
                }
              }
            }
          },
          entries: {
            columns: {
              id: true
            }
          }
        }
      });

      // If the user is not a participant of any convo, throw an error
      // it is not possible for this to happen from the UI, so no need to handle other convos gracefully
      if (convoQueryResponses.length !== convoPublicIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more conversations not found'
        });
      }

      // Check if the user is a direct participant or a team member of the convo and create a boolean array
      const userInConvos = convoQueryResponses.map((convo) =>
        convo.participants.some(
          (participant) =>
            participant.orgMemberId === accountOrgMemberId ||
            participant.team?.members.some(
              (teamMember) => teamMember.orgMemberId === accountOrgMemberId
            )
        )
      );

      // If not all convos are owned by the user, throw an error
      // again this is not possible from the UI
      if (!userInConvos.every((userInConvo) => userInConvo)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message:
            'You are not a participant one or more selected conversation and can not delete it'
        });
      }

      const convoIds = convoQueryResponses.map((convo) => convo.id);
      const convoParticipantIds = Array.from(
        new Set(
          convoQueryResponses.flatMap((convo) =>
            convo.participants.map((participant) => participant.id)
          )
        )
      );
      const convoEntriesIds = Array.from(
        new Set(
          convoQueryResponses.flatMap((convo) =>
            convo.entries.map((entry) => entry.id)
          )
        )
      );

      // return;
      await db.transaction(async (db) => {
        try {
          // Use the length checks to avoid throwing errors
          if (convoIds.length > 0) {
            //? convoSubjects
            await db
              .delete(convoSubjects)
              .where(inArray(convoSubjects.convoId, convoIds));

            //? convoParticipants
            await db
              .delete(convoParticipants)
              .where(inArray(convoParticipants.convoId, convoIds));

            //? convoSeenTimestamps
            await db
              .delete(convoSeenTimestamps)
              .where(inArray(convoSeenTimestamps.convoId, convoIds));
          }

          if (convoEntriesIds.length > 0) {
            //? convoEntries
            await db
              .delete(convoEntries)
              .where(inArray(convoEntries.id, convoEntriesIds));

            //? convoEntryReplies
            await db
              .delete(convoEntryReplies)
              .where(
                or(
                  inArray(convoEntryReplies.entryReplyId, convoEntriesIds),
                  inArray(convoEntryReplies.entrySourceId, convoEntriesIds)
                )
              );

            //? convoEntryPrivateVisibilityParticipants
            await db
              .delete(convoEntryPrivateVisibilityParticipants)
              .where(
                inArray(
                  convoEntryPrivateVisibilityParticipants.entryId,
                  convoEntriesIds
                )
              );
            //? convoEntryRawHtmlEmails
            await db
              .delete(convoEntryRawHtmlEmails)
              .where(inArray(convoEntryRawHtmlEmails.entryId, convoEntriesIds));

            //? convoEntrySeenTimestamps
            await db
              .delete(convoEntrySeenTimestamps)
              .where(
                inArray(convoEntrySeenTimestamps.convoEntryId, convoEntriesIds)
              );
          }

          if (convoParticipantIds.length > 0) {
            //? convoParticipantTeamMembers
            await db
              .delete(convoParticipantTeamMembers)
              .where(
                inArray(
                  convoParticipantTeamMembers.convoParticipantId,
                  convoParticipantIds
                )
              );
          }

          // convoAttachments - also delete from s3
          const attachmentsQuery = await db.query.convoAttachments.findMany({
            where: inArray(convoAttachments.convoId, convoIds),
            columns: {
              publicId: true,
              fileName: true
            }
          });

          if (attachmentsQuery.length > 0) {
            const attachmentsToDelete = attachmentsQuery.map((attachment) => ({
              orgPublicId: typeIdValidator('org').parse(orgPublicId),
              attachmentPublicId: attachment.publicId,
              filename: attachment.fileName
            }));

            const deleteStorageResponse = (await fetch(
              `${env.STORAGE_URL}/api/attachments/deleteAttachments`,
              {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: env.STORAGE_KEY
                },
                body: JSON.stringify({
                  attachments: attachmentsToDelete.map(
                    (attachment) =>
                      `${attachment.orgPublicId}/${attachment.attachmentPublicId}/${attachment.filename}`
                  )
                })
              }
            ).then((res) => res.json())) as unknown;

            if (!deleteStorageResponse) {
              console.error('🔥 Failed to delete attachments from storage', {
                attachmentsToDelete
              });
            }
          }

          await db
            .delete(convoAttachments)
            .where(inArray(convoAttachments.convoId, convoIds));

          await db.delete(convos).where(inArray(convos.id, convoIds));
        } catch (error) {
          console.error('🔥 Failed to delete convo', error);
          // Rollback throws error for some reason, we need to return the trpc error not the rollback error

          try {
            db.rollback();
          } catch {}

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete conversation'
          });
        }
      });

      const spaceShortCodes = await db.query.convoToSpaces
        .findMany({
          where: inArray(convoToSpaces.convoId, convoIds),
          columns: {
            id: true
          },
          with: {
            space: {
              columns: {
                shortcode: true
              }
            }
          }
        })
        .then((spaces) => spaces.map((space) => space.space.shortcode));

      const orgMemberPublicIdsForNotifications = Array.from(
        new Set(
          convoQueryResponses
            .flatMap((convo) =>
              convo.participants.map(
                (participant) => participant.orgMember?.publicId
              )
            )
            .filter(Boolean) as TypeId<'orgMembers'>[]
        )
      );

      if (orgMemberPublicIdsForNotifications.length > 0) {
        await realtime.emit({
          orgMemberPublicIds: orgMemberPublicIdsForNotifications,
          event: 'convo:deleted',
          data: { publicId: convoPublicId }
        });
      }

      return {
        success: true
      };
    })
});
