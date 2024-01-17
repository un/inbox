import { z } from 'zod';
import { parse } from 'superjson';
import { router, orgProcedure } from '../../trpc';
import { type InferInsertModel, and, eq, inArray } from '@uninbox/database/orm';
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
  emailIdentitiesAuthorizedUsers
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';
import type { JSONContent } from '@tiptap/vue-3';
import { generateText } from '@tiptap/core';
import { generateHTML } from '@tiptap/html';
import { tipTapExtensions } from '~/shared/editorConfig';

export const convoRouter = router({
  createNewConvo: orgProcedure
    .input(
      z.object({
        participantsOrgMembersPublicIds: z.array(
          z.string().min(3).max(nanoIdLength)
        ),
        participantsGroupsPublicIds: z
          .array(z.string().min(3).max(nanoIdLength))
          .optional(),
        participantsContactsPublicIds: z
          .array(z.string().min(3).max(nanoIdLength))
          .optional(),
        participantsEmails: z.array(z.string()).optional(),
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
      const userId = +user?.id;
      const userOrgMemberId = +org?.memberId;
      const orgId = +org?.id;
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
      if (participantsContactsPublicIds || participantsEmails) {
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
        orgId: orgId
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
        const convoMembersDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgMemberIds.forEach((orgMemberId) => {
          const convoMemberPublicId = nanoId();
          convoMembersDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            orgMemberId: orgMemberId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoMembersDbInsertValuesArray);
      }

      if (orgGroupIds.length) {
        const convoMembersDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgGroupIds.forEach((groupId) => {
          const convoMemberPublicId = nanoId();
          convoMembersDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            userGroupId: groupId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoMembersDbInsertValuesArray);
      }

      if (orgContactIds.length) {
        const convoMembersDbInsertValuesArray: InferInsertModel<
          typeof convoParticipants
        >[] = [];
        orgContactIds.forEach((contactId) => {
          const convoMemberPublicId = nanoId();
          convoMembersDbInsertValuesArray.push({
            orgId: orgId,
            convoId: +insertConvoResponse.insertId,
            publicId: convoMemberPublicId,
            contactId: contactId
          });
        });
        await db
          .insert(convoParticipants)
          .values(convoMembersDbInsertValuesArray);
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
    })
  // getUserConvos: orgProcedure
  //   .input(
  //     z.object({
  //       cursorLastUpdatedAt: z.date().optional(),
  //       cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     const { db, user, org } = ctx;
  //     const { cursorLastUpdatedAt, cursorLastPublicId } = input;
  //     const userId = user?.id || 0;
  //     const orgId = org?.id || 0;
  //     const inputLastUpdatedAt = cursorLastUpdatedAt
  //       ? new Date(cursorLastUpdatedAt)
  //       : new Date();
  //     const inputLastPublicId = cursorLastPublicId || '';
  //     // TODO: Add filtering for org based on input.filterOrgPublicId
  //     const convoQuery = await db.query.convos.findMany({
  //       orderBy: [desc(convos.lastUpdatedAt), desc(convos.publicId)],
  //       limit: 15,
  //       columns: {
  //         publicId: true,
  //         lastUpdatedAt: true
  //       },
  //       where: and(
  //         or(
  //           and(
  //             eq(convos.lastUpdatedAt, inputLastUpdatedAt),
  //             lt(convos.publicId, inputLastPublicId)
  //           ),
  //           lt(convos.lastUpdatedAt, inputLastUpdatedAt)
  //         ),
  //         inArray(
  //           convos.id,
  //           db
  //             .select({ id: convoParticipants.convoId })
  //             .from(convoParticipants)
  //             .where(
  //               or(
  //                 eq(convoParticipants.userId, userId),
  //                 inArray(
  //                   convoParticipants.userGroupId,
  //                   db
  //                     .select({ id: userGroupMembers.groupId })
  //                     .from(userGroupMembers)
  //                     .where(eq(userGroupMembers.userId, userId))
  //                 )
  //               )
  //             )
  //         )
  //       ),
  //       with: {
  //         org: {
  //           columns: {
  //             publicId: true,
  //             name: true,
  //             avatarId: true
  //           }
  //         },
  //         subjects: {
  //           columns: {
  //             subject: true
  //           }
  //         },
  //         members: {
  //           with: {
  //             orgMember: {
  //               with: {
  //                 profile: {
  //                   columns: {
  //                     firstName: true,
  //                     lastName: true,
  //                     avatarId: true,
  //                     handle: true
  //                   }
  //                 }
  //               }
  //             },
  //             userGroup: {
  //               columns: {
  //                 name: true,
  //                 color: true,
  //                 avatarId: true
  //               }
  //             },
  //             foreignEmailIdentity: {
  //               columns: {
  //                 senderName: true,
  //                 avatarId: true,
  //                 username: true,
  //                 rootDomain: true
  //               }
  //             }
  //           },
  //           columns: {
  //             id: true,
  //             orgMemberId: true,
  //             userGroupId: true,
  //             foreignEmailIdentityId: true,
  //             role: true
  //           }
  //         },
  //         messages: {
  //           orderBy: [desc(convoMessages.createdAt)],
  //           limit: 1,
  //           columns: {
  //             body: true
  //           },
  //           with: {
  //             author: {
  //               with: {
  //                 orgMember: {
  //                   with: {
  //                     profile: {
  //                       columns: {
  //                         firstName: true,
  //                         lastName: true,
  //                         avatarId: true,
  //                         handle: true
  //                       }
  //                     }
  //                   }
  //                 },
  //                 userGroup: {
  //                   columns: {
  //                     name: true,
  //                     color: true,
  //                     avatarId: true
  //                   }
  //                 },
  //                 foreignEmailIdentity: {
  //                   columns: {
  //                     senderName: true,
  //                     avatarId: true
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     });
  //     const newCursorLastUpdatedAt =
  //       convoQuery[convoQuery.length - 1].lastUpdatedAt;
  //     const newCursorLastPublicId = convoQuery[convoQuery.length - 1].publicId;
  //     return {
  //       data: convoQuery,
  //       cursor: {
  //         lastUpdatedAt: newCursorLastUpdatedAt,
  //         lastPublicId: newCursorLastPublicId
  //       }
  //     };
  //   }),
  // getConvo: orgProcedure
  //   .input(
  //     z.object({
  //       convoPublicId: z.string().min(3).max(nanoIdLength)
  //     })
  //   )
  //   .query(async ({ ctx, input }) => {
  //     const { db, user, org } = ctx;
  //     const { convoPublicId } = input;
  //     const userId = user?.id || 0;
  //     const orgId = org?.id || 0;
  //     // TODO: Add filtering for org based on input.filterOrgPublicId
  //     const convoDetails = await db.query.convos.findFirst({
  //       columns: {
  //         publicId: true,
  //         lastUpdatedAt: true,
  //         createdAt: true
  //       },
  //       where: eq(convos.publicId, convoPublicId),
  //       with: {
  //         org: {
  //           columns: {
  //             publicId: true,
  //             name: true,
  //             avatarId: true
  //           }
  //         },
  //         subjects: {
  //           columns: {
  //             subject: true
  //           }
  //         },
  //         members: {
  //           with: {
  //             orgMember: {
  //               with: {
  //                 profile: {
  //                   columns: {
  //                     userId: true,
  //                     firstName: true,
  //                     lastName: true,
  //                     avatarId: true,
  //                     publicId: true,
  //                     handle: true
  //                   }
  //                 }
  //               }
  //             },
  //             userGroup: {
  //               columns: {
  //                 name: true,
  //                 color: true,
  //                 avatarId: true,
  //                 publicId: true
  //               },
  //               with: {
  //                 members: {
  //                   columns: {
  //                     userId: true
  //                   }
  //                 }
  //               }
  //             },
  //             foreignEmailIdentity: {
  //               columns: {
  //                 senderName: true,
  //                 avatarId: true,
  //                 username: true,
  //                 rootDomain: true,
  //                 publicId: true
  //               }
  //             }
  //           },
  //           columns: {
  //             orgMemberId: true,
  //             userGroupId: true,
  //             foreignEmailIdentityId: true,
  //             role: true
  //           }
  //         },
  //         attachments: {
  //           columns: {
  //             publicId: true,
  //             fileName: true,
  //             type: true,
  //             storageId: true
  //           }
  //         }
  //       }
  //     });
  //     if (!convoDetails) {
  //       console.log('Convo not found');
  //       return {
  //         data: null
  //       };
  //     }
  //     //Check if the user is in the conversation
  //     const convoParticipantsUserIds: number[] = [];
  //     convoDetails?.members.forEach((member) => {
  //       member.orgMember?.userId &&
  //         convoParticipantsUserIds.push(member.orgMember?.userId);
  //       member.orgMember?.profile?.userId &&
  //         convoParticipantsUserIds.push(member.orgMember?.profile.userId);
  //       member.userGroup?.members.forEach((groupMember) => {
  //         groupMember.userId &&
  //           convoParticipantsUserIds.push(groupMember.userId);
  //       });
  //     });
  //     if (!convoParticipantsUserIds.includes(+userId)) {
  //       console.log('User not in convo');
  //       console.log({ userId, convoParticipantsUserIds });
  //       return {
  //         data: null
  //       };
  //     }
  //     // strip the user IDs from the response
  //     convoDetails.members.forEach((member) => {
  //       if (member.orgMember?.userId) member.orgMember.userId = 0;
  //       if (member.orgMember?.profile?.userId)
  //         member.orgMember.profile.userId = 0;
  //       member.userGroup?.members.forEach((groupMember) => {
  //         if (groupMember.userId) groupMember.userId = 0;
  //       });
  //     });
  //     return {
  //       data: convoDetails
  //     };
  //   }),
});
