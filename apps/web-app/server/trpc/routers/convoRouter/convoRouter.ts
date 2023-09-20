import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../trpc';
import { and, desc, eq, inArray, lt, or } from '@uninbox/database/orm';
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
      const builder = await db.read.query.convos.findMany({
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
              userProfile: {
                columns: {
                  firstName: true,
                  lastName: true,
                  avatarId: true
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
              userId: true,
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
                  userProfile: {
                    columns: {
                      firstName: true,
                      lastName: true,
                      avatarId: true
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

      const newCursorLastUpdatedAt = builder[builder.length - 1].lastUpdatedAt;
      const newCursorLastPublicId = builder[builder.length - 1].publicId;

      return {
        data: builder,
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
              userProfile: {
                columns: {
                  userId: true,
                  firstName: true,
                  lastName: true,
                  avatarId: true,
                  publicId: true
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
              userId: true,
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
        member.userId && convoMembersUserIds.push(member.userId);
        member.userProfile?.userId &&
          convoMembersUserIds.push(member.userProfile.userId);
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
        member.userId = null;
        if (member.userProfile?.userId) member.userProfile.userId = 0;
        member.userGroup?.members.forEach((groupMember) => {
          if (groupMember.userId) groupMember.userId = 0;
        });
      });

      return {
        data: convoDetails
      };
    }),

  getConvoMessages: protectedProcedure
    .input(
      z.object({
        convoPublicId: z.string().min(3).max(nanoIdLength),
        cursorLastCreatedAt: z.date().optional(),
        cursorLastPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { convoPublicId, cursorLastCreatedAt, cursorLastPublicId } = input;
      const userId = user.userId || 0;

      const inputLastCreatedAt = cursorLastCreatedAt
        ? new Date(cursorLastCreatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || '';

      // TODO: Find a better way to do this
      // Verify the user is in the convo
      const convoDetails = await db.read.query.convos.findFirst({
        where: eq(convos.publicId, convoPublicId),
        columns: {
          id: true
        },
        with: {
          members: {
            with: {
              userProfile: {
                columns: {
                  userId: true,
                  firstName: true,
                  lastName: true,
                  avatarId: true,
                  publicId: true
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
              userId: true,
              userGroupId: true,
              foreignEmailIdentityId: true,
              role: true
            }
          }
        }
      });

      if (!convoDetails) {
        console.log('Convo not found');
        return {
          error: 'Convo not found'
        };
      }
      //Check if the user is in the conversation
      const convoMembersUserIds: number[] = [];
      convoDetails?.members.forEach((member) => {
        member.userId && convoMembersUserIds.push(member.userId);
        member.userProfile?.userId &&
          convoMembersUserIds.push(member.userProfile.userId);
        member.userGroup?.members.forEach((groupMember) => {
          groupMember.userId && convoMembersUserIds.push(groupMember.userId);
        });
      });

      if (!convoMembersUserIds.includes(+userId)) {
        console.log('User not in convo');
        console.log({ userId, convoMembersUserIds });
        return {
          error: 'User not in convo'
        };
      }

      const convoMessagesReturn = await db.read.query.convoMessages.findMany({
        orderBy: [desc(convoMessages.createdAt), desc(convoMessages.publicId)],
        limit: 15,
        columns: {
          publicId: true,
          createdAt: true,
          author: true,
          body: true
        },
        where: and(
          or(
            and(
              eq(convoMessages.createdAt, inputLastCreatedAt),
              lt(convoMessages.publicId, inputLastPublicId)
            ),
            lt(convoMessages.createdAt, inputLastCreatedAt)
          ),
          eq(convoMessages.convoId, convoDetails.id)
        )
      });

      return {
        messages: convoMessagesReturn
      };
    })
});
