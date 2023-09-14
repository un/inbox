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
      const builder = await db.query.convos.findMany({
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
              .select({ id: convoMembers.convoId })
              .from(convoMembers)
              .where(
                or(
                  eq(convoMembers.userId, userId),
                  inArray(
                    convoMembers.userGroupId,
                    db
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
    })
});
