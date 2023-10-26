import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../trpc';
import {
  InferInsertModel,
  and,
  desc,
  eq,
  inArray,
  lt,
  or
} from '@uninbox/database/orm';
import {
  convos,
  convoMembers,
  convoSubjects,
  userProfiles,
  foreignEmailIdentities,
  userGroups,
  userGroupMembers,
  convoMessages
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';

export const convoRouter = router({
  getUserConvos: protectedProcedure
    .input(
      z.object({
        filterOrgPublicId: z.string().min(3).max(nanoIdLength).optional(),
        cursorLastUpdatedAt: z.date().optional(),
        cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { filterOrgPublicId, cursorLastUpdatedAt, cursorLastPublicId } =
        input;
      const userId = user.userId || 0;

      const inputLastUpdatedAt = cursorLastUpdatedAt
        ? new Date(cursorLastUpdatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || '';

      // TODO: Add filtering for org based on input.filterOrgPublicId
      const convoQuery = await db.read.query.convos.findMany({
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
            db.read
              .select({ id: convoMembers.convoId })
              .from(convoMembers)
              .where(
                or(
                  eq(convoMembers.userId, userId),
                  inArray(
                    convoMembers.userGroupId,
                    db.read
                      .select({ id: userGroupMembers.groupId })
                      .from(userGroupMembers)
                      .where(eq(userGroupMembers.userId, userId))
                  )
                )
              )
          )
        ),
        with: {
          org: {
            columns: {
              publicId: true,
              name: true,
              avatarId: true
            }
          },
          subjects: {
            columns: {
              subject: true
            }
          },
          members: {
            with: {
              orgMember: {
                with: {
                  profile: {
                    columns: {
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
                  name: true,
                  color: true,
                  avatarId: true
                }
              },
              foreignEmailIdentity: {
                columns: {
                  senderName: true,
                  avatarId: true,
                  username: true,
                  rootDomain: true
                }
              }
            },
            columns: {
              id: true,
              orgMemberId: true,
              userGroupId: true,
              foreignEmailIdentityId: true,
              role: true
            }
          },
          messages: {
            orderBy: [desc(convoMessages.createdAt)],
            limit: 1,
            columns: {
              body: true
            },
            with: {
              author: {
                with: {
                  orgMember: {
                    with: {
                      profile: {
                        columns: {
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
                      name: true,
                      color: true,
                      avatarId: true
                    }
                  },
                  foreignEmailIdentity: {
                    columns: {
                      senderName: true,
                      avatarId: true
                    }
                  }
                }
              }
            }
          }
        }
      });

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
    }),
  getConvo: protectedProcedure
    .input(
      z.object({
        convoPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { convoPublicId } = input;
      const userId = user.userId || 0;

      // TODO: Add filtering for org based on input.filterOrgPublicId
      const convoDetails = await db.read.query.convos.findFirst({
        columns: {
          publicId: true,
          lastUpdatedAt: true,
          createdAt: true
        },
        where: eq(convos.publicId, convoPublicId),
        with: {
          org: {
            columns: {
              publicId: true,
              name: true,
              avatarId: true
            }
          },
          subjects: {
            columns: {
              subject: true
            }
          },
          members: {
            with: {
              orgMember: {
                with: {
                  profile: {
                    columns: {
                      userId: true,
                      firstName: true,
                      lastName: true,
                      avatarId: true,
                      publicId: true,
                      handle: true
                    }
                  }
                }
              },
              userGroup: {
                columns: {
                  name: true,
                  color: true,
                  avatarId: true,
                  publicId: true
                },
                with: {
                  members: {
                    columns: {
                      userId: true
                    }
                  }
                }
              },
              foreignEmailIdentity: {
                columns: {
                  senderName: true,
                  avatarId: true,
                  username: true,
                  rootDomain: true,
                  publicId: true
                }
              }
            },
            columns: {
              orgMemberId: true,
              userGroupId: true,
              foreignEmailIdentityId: true,
              role: true
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
        console.log('Convo not found');
        return {
          data: null
        };
      }
      //Check if the user is in the conversation
      const convoMembersUserIds: number[] = [];
      convoDetails?.members.forEach((member) => {
        member.orgMember?.userId &&
          convoMembersUserIds.push(member.orgMember?.userId);
        member.orgMember?.profile?.userId &&
          convoMembersUserIds.push(member.orgMember?.profile.userId);
        member.userGroup?.members.forEach((groupMember) => {
          groupMember.userId && convoMembersUserIds.push(groupMember.userId);
        });
      });

      if (!convoMembersUserIds.includes(+userId)) {
        console.log('User not in convo');
        console.log({ userId, convoMembersUserIds });
        return {
          data: null
        };
      }

      // strip the user IDs from the response
      convoDetails.members.forEach((member) => {
        if (member.orgMember?.userId) member.orgMember.userId = 0;
        if (member.orgMember?.profile?.userId)
          member.orgMember.profile.userId = 0;
        member.userGroup?.members.forEach((groupMember) => {
          if (groupMember.userId) groupMember.userId = 0;
        });
      });

      return {
        data: convoDetails
      };
    }),
  createConvo: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        sendAsPublicId: z.string().min(3).max(nanoIdLength),
        authorPublicId: z.string().min(3).max(nanoIdLength),
        participantsUsers: z.array(z.string().min(3).max(nanoIdLength)),
        participantsGroups: z.array(z.string().min(3).max(nanoIdLength)),
        participantsExternalEmails: z.array(z.string().min(1)),
        topic: z.string().min(1),
        message: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const userId = user.userId || 0;
      const { orgPublicId, participantsExternalEmails } = input;

      const userOrg = await isUserInOrg({
        userId,
        orgPublicId
      });

      if (!userOrg) {
        throw new Error('User not in org');
      }

      const newPublicId = nanoId();

      // create convo

      const convoInsertResponse = await db.write.insert(convos).values({
        publicId: newPublicId,
        orgId: userOrg.orgId,
        screenerStatus: 'approved',
        lastUpdatedAt: new Date()
      });

      // create subject
      await db.write.insert(convoSubjects).values({
        convoId: +convoInsertResponse.insertId,
        subject: input.topic
      });

      // Create external people if dont exist in system
      // Split email addresses into username and rootDomain
      const emailParts = participantsExternalEmails.map((email) => {
        const [username, rootDomain] = email.split('@');
        return { username, rootDomain };
      });

      // Query the database
      const existingForeignIdentities =
        await db.read.query.foreignEmailIdentities.findMany({
          where: or(
            ...emailParts.map((part) =>
              and(
                eq(foreignEmailIdentities.username, part.username),
                eq(foreignEmailIdentities.rootDomain, part.rootDomain)
              )
            )
          ),
          columns: {
            id: true,
            username: true,
            rootDomain: true
          }
        });
      const foreignIdentitiesIds = existingForeignIdentities.map(
        (identity) => +identity.id
      );

      // Check for non-existing emails and create new entries for non existant
      const existingEmails = new Set(
        existingForeignIdentities.map(
          (identity) => `${identity.username}@${identity.rootDomain}`
        )
      );
      const newEmails = emailParts.filter(
        (part) => !existingEmails.has(`${part.username}@${part.rootDomain}`)
      );

      for (const newEmail of newEmails) {
        // Create new entry in the database
        const newPublicId = nanoId();
        const insertNewResponse = await db.write
          .insert(foreignEmailIdentities)
          .values({
            publicId: newPublicId,
            username: newEmail.username,
            rootDomain: newEmail.rootDomain
          });
        foreignIdentitiesIds.push(+insertNewResponse.insertId);
      }

      // get userId/Profile Id from orgMemberPublicId EXCEPT FOR AUTHOR

      // Get Group ID from groupPublic Id

      // add convo members
      const convoMembersInsertResponse = await db.write
        .insert(convoMembers)
        .values({
          convoId: +convoInsertResponse.insertId,
          role: 'assigned',
          userId: 0,
          userProfileId: 0,
          notifications: 'active',
          active: true,
          userGroupId: 0,
          foreignEmailIdentityId: 0
        });

      // Insert Author into ConvoMembers, but save ID for message author

      // add external people screener status

      // add message to convo

      // send email to external email address

      return {
        data: convoDetails
      };
    })
});
