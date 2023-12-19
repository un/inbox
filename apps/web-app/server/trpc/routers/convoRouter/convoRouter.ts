import { z } from 'zod';
import { router, orgProcedure, limitedProcedure } from '../../trpc';
import {
  type InferInsertModel,
  and,
  desc,
  eq,
  inArray,
  lt,
  or
} from '@uninbox/database/orm';
import {
  convos,
  convoParticipants,
  convoSubjects,
  userProfiles,
  // foreignEmailIdentities,
  userGroups,
  userGroupMembers,
  // convoMessages,
  orgMembers
  // foreignEmailIdentitiesScreenerStatus
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';
import { TRPCError } from '@trpc/server';

export const convoRouter = router({
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
  // createConvo: orgProcedure
  //   .input(
  //     z.object({
  //       orgPublicId: z.string().min(3).max(nanoIdLength),
  //       sendAsPublicId: z.string().min(3).max(nanoIdLength),
  //       authorPublicId: z.string().min(3).max(nanoIdLength),
  //       participantsUsers: z.array(z.string().min(3).max(nanoIdLength)),
  //       participantsGroups: z.array(z.string().min(3).max(nanoIdLength)),
  //       participantsExternalEmails: z.array(z.string().min(1)),
  //       topic: z.string().min(1),
  //       message: z.string().min(1)
  //     })
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     if (!ctx.user || !ctx.org) {
  //       throw new TRPCError({
  //         code: 'UNPROCESSABLE_CONTENT',
  //         message: 'User or Organization is not defined'
  //       });
  //     }
  //     const { db, user, org } = ctx;
  //     const userId = +user?.id;
  //     const orgId = +org?.id;
  //     const {
  //       orgPublicId,
  //       participantsExternalEmails,
  //       participantsGroups,
  //       participantsUsers,
  //       authorPublicId
  //     } = input;
  //     const authorOrgMemberResponse = await db.query.orgMembers.findFirst({
  //       where: eq(orgMembers.publicId, authorPublicId),
  //       columns: {
  //         id: true
  //       }
  //     });
  //     if (!authorOrgMemberResponse || !authorOrgMemberResponse.id) {
  //       throw new Error('Author Id Not Found!');
  //     }
  //     const newPublicId = nanoId();
  //     // create convo
  //     const convoInsertResponse = await db.insert(convos).values({
  //       publicId: newPublicId,
  //       orgId: orgId,
  //       screenerStatus: 'approved',
  //       lastUpdatedAt: new Date()
  //     });
  //     // create subject
  //     const subjectInsertResponse = await db
  //       .insert(convoSubjects)
  //       .values({
  //         convoId: +convoInsertResponse.insertId,
  //         subject: input.topic
  //       });
  //     let foreignIdentitiesIds: number[] = [];
  //     if (participantsExternalEmails && participantsExternalEmails.length > 0) {
  //       // Create external people if dont exist in system
  //       // 1. Split email addresses into username and rootDomain
  //       const emailParts = participantsExternalEmails.map((email) => {
  //         const [username, rootDomain] = email.split('@');
  //         return { username, rootDomain };
  //       });
  //       // 2. Query the database to see if they already exist
  //       const existingForeignIdentities =
  //         await db.query.foreignEmailIdentities.findMany({
  //           where: or(
  //             ...emailParts.map((part) =>
  //               and(
  //                 eq(foreignEmailIdentities.username, part.username),
  //                 eq(foreignEmailIdentities.rootDomain, part.rootDomain)
  //               )
  //             )
  //           ),
  //           columns: {
  //             id: true,
  //             username: true,
  //             rootDomain: true
  //           }
  //         });
  //       foreignIdentitiesIds = existingForeignIdentities.map(
  //         (identity) => +identity.id
  //       );
  //       // change existing emails formats, and create new array without them (only with missing ones)
  //       const existingEmails = new Set(
  //         existingForeignIdentities.map(
  //           (identity) => `${identity.username}@${identity.rootDomain}`
  //         )
  //       );
  //       const newEmails = emailParts.filter(
  //         (part) => !existingEmails.has(`${part.username}@${part.rootDomain}`)
  //       );
  //       for (const newEmail of newEmails) {
  //         const newPublicId = nanoId();
  //         const insertNewResponse = await db
  //           .insert(foreignEmailIdentities)
  //           .values({
  //             publicId: newPublicId,
  //             username: newEmail.username,
  //             rootDomain: newEmail.rootDomain
  //           });
  //         foreignIdentitiesIds.push(+insertNewResponse.insertId);
  //       }
  //     }
  //     // Get Group ID from groupPublic Id
  //     let groupIds: number[] = [];
  //     if (participantsGroups.length > 0) {
  //       const groupResponses = await db.query.userGroups.findMany({
  //         where: inArray(userGroups.publicId, participantsGroups),
  //         columns: {
  //           id: true
  //         }
  //       });
  //       groupIds = groupResponses.map((group) => group.id);
  //     }
  //     let orgMemberIds: number[] = [];
  //     if (participantsUsers.length > 0) {
  //       const orgMemberResponses = await db.query.orgMembers.findMany({
  //         where: inArray(orgMembers.publicId, participantsUsers),
  //         columns: {
  //           id: true
  //         }
  //       });
  //       orgMemberIds = orgMemberResponses.map((member) => member.id);
  //     }
  //     // add convo members
  //     type ConvoParticipantsDbInsertValue = InferInsertModel<
  //       typeof convoParticipants
  //     >;
  //     const convoParticipantsDbInsertValuesArray: ConvoParticipantsDbInsertValue[] =
  //       [];
  //     // For each foreignIdentitiesIds && groupIds && orgMemberId
  //     foreignIdentitiesIds.forEach((id) => {
  //       convoParticipantsDbInsertValuesArray.push({
  //         convoId: +convoInsertResponse.insertId,
  //         role: 'contributor',
  //         notifications: 'active',
  //         active: true,
  //         foreignEmailIdentityId: +id
  //       });
  //     });
  //     groupIds.forEach((id) => {
  //       convoParticipantsDbInsertValuesArray.push({
  //         convoId: +convoInsertResponse.insertId,
  //         role: 'contributor',
  //         notifications: 'active',
  //         active: true,
  //         userGroupId: +id
  //       });
  //     });
  //     orgMemberIds.forEach((id) => {
  //       convoParticipantsDbInsertValuesArray.push({
  //         convoId: +convoInsertResponse.insertId,
  //         role: 'contributor',
  //         orgMemberId: +id,
  //         notifications: 'active',
  //         active: true
  //       });
  //     });
  //     await db
  //       .insert(convoParticipants)
  //       .values(convoParticipantsDbInsertValuesArray);
  //     const authorConvoMemberInsertResponse = await db
  //       .insert(convoParticipants)
  //       .values({
  //         convoId: +convoInsertResponse.insertId,
  //         role: 'assigned',
  //         orgMemberId: +authorOrgMemberResponse?.id,
  //         notifications: 'active',
  //         active: true
  //       });
  //     // add external people screener status
  //     type ForeignEmailIdentitiesScreenerStatusInsertValue = InferInsertModel<
  //       typeof foreignEmailIdentitiesScreenerStatus
  //     >;
  //     const foreignEmailIdentitiesScreenerStatusInsertArray: ForeignEmailIdentitiesScreenerStatusInsertValue[] =
  //       [];
  //     foreignIdentitiesIds.forEach((id) => {
  //       const newPublicId = nanoId();
  //       foreignEmailIdentitiesScreenerStatusInsertArray.push({
  //         foreignIdentityId: +id,
  //         orgId: +userOrg.orgId,
  //         publicId: newPublicId,
  //         setByOrgMemberId: +authorOrgMemberResponse.id,
  //         level: 'org',
  //         status: 'approve'
  //       });
  //     });
  //     if (foreignEmailIdentitiesScreenerStatusInsertArray.length > 0) {
  //       await db
  //         .insert(foreignEmailIdentitiesScreenerStatus)
  //         .values(foreignEmailIdentitiesScreenerStatusInsertArray);
  //     }
  //     // send email to external email address
  //     // add message to convo
  //     const newConvoMessagePublicId = nanoId();
  //     await db.insert(convoMessages).values({
  //       convoId: +convoInsertResponse.insertId,
  //       publicId: newConvoMessagePublicId,
  //       subjectId: +subjectInsertResponse.insertId,
  //       author: +authorConvoMemberInsertResponse.insertId,
  //       body: input.message
  //     });
  //     return {
  //       data: convoDetails
  //     };
  //   })
});
