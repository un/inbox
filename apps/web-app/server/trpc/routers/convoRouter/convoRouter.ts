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
} from '@uninbox/database/orm';
import {
  convos,
  convoParticipants,
  convoSubjects,
  userProfiles,
  userGroups,
  orgMembers,
  contacts,
  contactGlobalReputations,
  convoEntries,
  emailIdentitiesAuthorizedUsers,
  userGroupMembers
} from '@uninbox/database/schema';
import {
  nanoId,
  nanoIdLength,
  nanoIdSchema,
  nanoIdToken
} from '@uninbox/utils';
import { TRPCError } from '@trpc/server';
import type { JSONContent } from '@tiptap/vue-3';
import { generateText } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import { tipTapExtensions } from '~/shared/editorConfig';
import { convoEntryRouter } from './entryRouter';

export const convoRouter = router({
  entries: convoEntryRouter,
  createNewConvo: orgProcedure
    .input(
      z.object({
        participantsOrgMembersPublicIds: z.array(
          z.string().min(3).max(nanoIdLength)
        ),
        participantsGroupsPublicIds: z.array(
          z.string().min(3).max(nanoIdLength)
        ),
        participantsContactsPublicIds: z.array(
          z.string().min(3).max(nanoIdLength)
        ),
        participantsEmails: z.array(z.string()),
        sendAsEmailIdentityPublicId: z
          .string()
          .min(3)
          .max(nanoIdLength)
          .optional(),
        to: z
          .object({
            type: z.enum(['user', 'group', 'contact']),
            publicId: z.string().min(3).max(nanoIdLength)
          })
          .or(
            z.object({
              type: z.enum(['email']),
              emailAddress: z.string().min(3)
            })
          ),
        topic: z.string().min(1),
        message: z.string().min(1),
        firstMessageType: z.enum(['message', 'draft', 'comment'])
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User is not a member of the organization'
        });
      }
      const userId = user?.id;
      const userOrgMemberId = org?.memberId;
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

      const message: JSONContent = parse(messageString);

      console.log({
        sendAsEmailIdentityPublicId,
        participantsEmails,
        participantsOrgMembersPublicIds,
        participantsGroupsPublicIds,
        participantsContactsPublicIds,
        topic,
        message,
        convoMessageTo
      });

      // early check if "to" value has a valid email address, if not, then return an error

      async function getConvoToAddress() {
        const convoMessageToType = convoMessageTo.type;
        if (convoMessageToType === 'email') {
          return convoMessageTo.emailAddress;
        } else if (convoMessageToType === 'contact') {
          const contactResponse = await db.query.contacts.findFirst({
            where: eq(contacts.publicId, convoMessageTo.publicId),
            columns: {
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
          return `${contactResponse.emailUsername}@${contactResponse.emailDomain}`;
        } else if (convoMessageToType === 'group') {
          const groupResponse = await db.query.userGroups.findFirst({
            where: eq(userGroups.publicId, convoMessageTo.publicId),
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
            await db.query.emailIdentitiesAuthorizedUsers.findFirst({
              where: and(
                eq(
                  emailIdentitiesAuthorizedUsers.userGroupId,
                  groupResponse.id
                ),
                eq(emailIdentitiesAuthorizedUsers.default, true)
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
          return `${emailIdentitiesResponse.identity.username}@${emailIdentitiesResponse.identity.domainName}`;
        } else if (convoMessageToType === 'user') {
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
            await db.query.emailIdentitiesAuthorizedUsers.findFirst({
              where: and(
                eq(
                  emailIdentitiesAuthorizedUsers.orgMemberId,
                  orgMemberResponse.id
                ),
                eq(emailIdentitiesAuthorizedUsers.default, true)
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
        const groupResponses = await db.query.userGroups.findMany({
          where: inArray(userGroups.publicId, participantsGroupsPublicIds),
          columns: {
            id: true
          }
        });
        orgGroupIds.push(...groupResponses.map((userGroups) => userGroups.id));

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
          where: inArray(userProfiles.publicId, participantsContactsPublicIds),
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
          const [emailUsername, emailDomain] = email.split('@');
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
              const newContactPublicId = nanoId();
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
              orgContactIds.push(+newContactInsertResponse.insertId);
              orgContactReputationIds.push(existingContactGlobalReputations.id);
            } else {
              const newContactGlobalReputationInsertResponse = await db
                .insert(contactGlobalReputations)
                .values({
                  emailAddress: email
                });

              const newContactPublicId = nanoId();
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
              orgContactIds.push(+newContactInsertResponse.insertId);
              orgContactReputationIds.push(
                +newContactGlobalReputationInsertResponse.insertId
              );
            }
          }
        }
      }

      // create the conversation get id
      const newConvoPublicId = nanoId();
      const insertConvoResponse = await db.insert(convos).values({
        publicId: newConvoPublicId,
        orgId: orgId,
        lastUpdatedAt: new Date()
      });

      // create conversationSubject entry
      const newConvoSubjectPublicId = nanoId();
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
          const convoMemberPublicId = nanoId();
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
          const convoMemberPublicId = nanoId();
          convoParticipantsDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            userGroupId: groupId
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
          const convoMemberPublicId = nanoId();
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
      const authorConvoParticipantPublicId = nanoId();
      const insertAuthorConvoParticipantResponse = await db
        .insert(convoParticipants)
        .values({
          orgId: orgId,
          convoId: +insertConvoResponse.insertId,
          publicId: authorConvoParticipantPublicId,
          orgMemberId: userOrgMemberId,
          role: 'assigned'
        });

      // create convoEntry

      const newConvoBody = message;
      const newConvoBodyPlainText = generateText(
        newConvoBody,
        tipTapExtensions
      );

      const newConvoEntryPublicId = nanoId();
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

      //* if convo has contacts, send external email via mail bridge
      const convoHasEmailParticipants = orgContactIds.length > 0;
      const missingEmailIdentitiesWarnings: {
        type: 'user' | 'group';
        publicId: String;
        name: String;
      }[] = [];

      if (convoHasEmailParticipants) {
        const newConvoBodyHTML = generateHTML(newConvoBody, tipTapExtensions);
        const ccEmailAddresses: string[] = [];

        // get the email addresses for all contacts
        orgContactIds.forEach(async (contactId) => {
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
        });

        // get the default email addresses for all users
        if (orgMemberIds.length) {
          orgMemberIds.forEach(async (orgMemberId) => {
            const emailIdentityReponse =
              await db.query.emailIdentitiesAuthorizedUsers.findFirst({
                where: and(
                  eq(emailIdentitiesAuthorizedUsers.orgMemberId, orgMemberId),
                  eq(emailIdentitiesAuthorizedUsers.default, true)
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
            if (!emailIdentityReponse) {
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
            if (emailIdentityReponse) {
              ccEmailAddresses.push(
                `${emailIdentityReponse.identity.username}@${emailIdentityReponse.identity.domainName}`
              );
            }
          });
        }

        // get the default email addresses for all groups
        if (orgGroupIds.length) {
          orgGroupIds.forEach(async (orgGroupId) => {
            const emailIdentityReponse =
              await db.query.emailIdentitiesAuthorizedUsers.findFirst({
                where: and(
                  eq(emailIdentitiesAuthorizedUsers.userGroupId, orgGroupId),
                  eq(emailIdentitiesAuthorizedUsers.default, true)
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
            if (!emailIdentityReponse) {
              const orgGroupResponse = await db.query.userGroups.findFirst({
                where: eq(userGroups.id, orgGroupId),
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
            if (emailIdentityReponse) {
              ccEmailAddresses.push(
                `${emailIdentityReponse.identity.username}@${emailIdentityReponse.identity.domainName}`
              );
            }
          });
        }

        // remove TO email address from CCs if it exists
        const ccEmailAddressesFiltered = ccEmailAddresses.filter(
          (emailAddress) => {
            return emailAddress !== newConvoToEmailAddress;
          }
        );

        // to, cc, subject, bodyPlain, bodyHTML, attachmentIds, sendAsEmailIdentityPublicId

        await mailBridgeTrpcClient.mail.send.sendNewEmail.mutate({
          orgId: orgId,
          convoId: +insertConvoResponse.insertId,
          entryId: +insertConvoEntryResponse.insertId,
          sendAsEmailIdentityPublicId: sendAsEmailIdentityPublicId || '',
          toEmail: newConvoToEmailAddress,
          ccEmail: ccEmailAddressesFiltered,
          subject: topic,
          bodyHtml: newConvoBodyHTML,
          bodyPlainText: newConvoBodyPlainText
        });
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
        convoPublicId: nanoIdSchema
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;

      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User is not a member of the organization'
        });
      }

      const userId = user.id;
      const orgId = org.id;
      const userOrgMemberId = org.memberId;

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
            userId: true
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
          Number(member?.userId ?? 0)
        );
        if (!convoOrgOwnerUserIds.includes(userId)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          });
        }
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Conversation is owned by ${convoOrgOwnerMembersIds[0].org.name} organization.`
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
              userGroupId: true,
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
              userGroup: {
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
                  signature: true
                }
              }
            }
          },
          attachments: {
            columns: {
              publicId: true,
              fileName: true,
              type: true,
              storageId: true
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

      // Find the participant.publicId for the userOrgMemberId
      let participantPublicId: string | undefined;

      // Check if the user's orgMemberId is in the conversation participants
      convoDetails?.participants.forEach((participant) => {
        if (participant.orgMember?.id === userOrgMemberId) {
          participantPublicId = participant.publicId;
        }
      });

      // If not found, check if the user's orgMemberId is in any participant's userGroup members
      if (!participantPublicId) {
        convoDetails?.participants.forEach((participant) => {
          participant.userGroup?.members.forEach((groupMember) => {
            if (groupMember.orgMemberId === userOrgMemberId) {
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
        participant.userGroup?.members.forEach((groupMember) => {
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
        convoPublicId: nanoIdSchema,
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {}),

  getUserConvos: orgProcedure
    .input(
      z.object({
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const { cursorLastUpdatedAt, cursorLastPublicId } = input;

      const userId = user.id;
      const orgId = org.id;
      const orgMemberId = org.memberId;

      const inputLastUpdatedAt = cursorLastUpdatedAt
        ? new Date(cursorLastUpdatedAt)
        : new Date();

      console.log('🔥', { inputLastUpdatedAt });
      const inputLastPublicId = cursorLastPublicId || '';

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
                    convoParticipants.userGroupId,
                    db
                      .select({ id: userGroupMembers.groupId })
                      .from(userGroupMembers)
                      .where(eq(userGroupMembers.orgMemberId, orgMemberId))
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
              userGroup: {
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
                  userGroup: {
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
        convoQuery[convoQuery.length - 1].lastUpdatedAt;
      const newCursorLastPublicId = convoQuery[convoQuery.length - 1].publicId;

      return {
        data: convoQuery,
        cursor: {
          lastUpdatedAt: newCursorLastUpdatedAt,
          lastPublicId: newCursorLastPublicId
        }
      };
    })
});
