import { z } from 'zod';
import { router, orgProcedure, limitedProcedure } from '../../trpc';
import { and, desc, eq, inArray, lt, or } from '@uninbox/database/orm';
import { convos, convoEntries } from '@uninbox/database/schema';
import {
  nanoId,
  nanoIdLength,
  nanoIdToken,
  nanoIdSchema
} from '@uninbox/utils';
import { TRPCError } from '@trpc/server';

export const convoEntryRouter = router({
  getConvoEntries: orgProcedure
    .input(
      z.object({
        convoPublicId: nanoIdSchema,
        cursorLastCreatedAt: z.date().optional(),
        cursorLastPublicId: nanoIdSchema.optional()
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

      const { convoPublicId, cursorLastCreatedAt, cursorLastPublicId } = input;
      const inputLastCreatedAt = cursorLastCreatedAt
        ? new Date(cursorLastCreatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || '';

      // check if the conversation belongs to the same org, early return if not before multiple db selects
      const convoResponse = await db.query.convos.findFirst({
        where: and(eq(convos.publicId, convoPublicId), eq(convos.orgId, orgId)),
        columns: {
          id: true
        }
      });
      if (!convoResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found or not in this organization'
        });
      }

      // TODO: Add filtering for org based on input.filterOrgPublicId
      const convoDetails = await db.query.convos.findFirst({
        columns: {
          id: true
        },
        where: eq(convos.id, convoResponse.id),
        with: {
          participants: {
            columns: {
              id: true
            },
            with: {
              orgMember: {
                columns: {
                  id: true
                }
              },
              userGroup: {
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
      if (!convoDetails) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found'
        });
      }

      //Check if the user's orgMemberId is in the conversation
      const convoParticipantsOrgMemberIds: number[] = [];
      convoDetails?.participants.forEach((participant) => {
        participant.orgMember?.id &&
          convoParticipantsOrgMemberIds.push(participant.orgMember?.id);
        participant.userGroup?.members.forEach((groupMember) => {
          groupMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(groupMember.orgMemberId);
        });
      });

      if (!convoParticipantsOrgMemberIds.includes(userOrgMemberId)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this conversation'
        });
      }

      // get the entries
      const convoEntriesQuery = await db.query.convoEntries.findMany({
        where: and(
          or(
            and(
              eq(convoEntries.createdAt, inputLastCreatedAt),
              lt(convoEntries.publicId, inputLastPublicId)
            ),
            lt(convoEntries.createdAt, inputLastCreatedAt)
          ),
          eq(convoEntries.convoId, convoDetails.id)
        ),
        orderBy: [desc(convoEntries.createdAt), desc(convoEntries.publicId)],
        limit: 15,
        columns: {
          publicId: true,
          createdAt: true,
          body: true,
          type: true
        },
        with: {
          subject: {
            columns: {
              publicId: true,
              subject: true
            }
          },
          attachments: {
            columns: {
              publicId: true,
              fileName: true,
              type: true,
              storageId: true
            }
          },
          author: {
            columns: {
              publicId: true
            }
          }
        }
      });

      return {
        entries: convoEntriesQuery
      };
    })
});
