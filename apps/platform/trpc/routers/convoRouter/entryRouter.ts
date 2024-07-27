import { convos, convoEntries } from '@u22n/database/schema';
import { router, orgProcedure } from '~platform/trpc/trpc';
import { and, desc, eq, lt, or } from '@u22n/database/orm';
import { typeIdValidator } from '@u22n/utils/typeid';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const convoEntryRouter = router({
  getConvoEntries: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos'),
        cursor: z
          .object({
            lastCreatedAt: z.date().optional(),
            lastPublicId: typeIdValidator('convoEntries').optional()
          })
          .default({})
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const orgId = org.id;
      const accountOrgMemberId = org.memberId;

      const {
        convoPublicId,
        cursor: { lastCreatedAt, lastPublicId }
      } = input;
      const inputLastCreatedAt = lastCreatedAt
        ? new Date(lastCreatedAt)
        : new Date();

      const inputLastPublicId = lastPublicId ?? 'ce_';

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
        participant.team?.members.forEach((teamMember) => {
          teamMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(teamMember.orgMemberId);
        });
      });

      if (!convoParticipantsOrgMemberIds.includes(accountOrgMemberId)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this conversation'
        });
      }

      const LIMIT = 15;
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
        limit: LIMIT + 1,
        columns: {
          publicId: true,
          createdAt: true,
          body: true,
          type: true,
          metadata: true
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
              type: true
            }
          },
          author: {
            columns: {
              publicId: true
            }
          },
          rawHtml: {
            columns: {
              wipeDate: true,
              keep: true
            }
          }
        }
      });

      // for each of the email.to, email.cc and email.from arrays from the metadata, set all entries.id fields to 0
      // we do this to prevent leaking internal ids to the client
      convoEntriesQuery.forEach((entry) => {
        if (entry.metadata?.email) {
          if (entry.metadata.email.to) {
            entry.metadata.email.to.forEach((to) => (to.id = 0));
          }
          if (entry.metadata.email.cc) {
            entry.metadata.email.cc.forEach((cc) => (cc.id = 0));
          }
          if (entry.metadata.email.from) {
            entry.metadata.email.from.forEach((from) => (from.id = 0));
          }
        }
      });

      // As we fetch ${LIMIT + 1} convos at a time, if the length is <= ${LIMIT}, we know we've reached the end
      if (convoEntriesQuery.length <= LIMIT) {
        return {
          entries: convoEntriesQuery,
          cursor: null
        };
      }

      // If we have ${LIMIT + 1} convos, we pop the last one as we return ${LIMIT} convos
      convoEntriesQuery.pop();

      const newCursorLastCreatedAt =
        convoEntriesQuery[convoEntriesQuery.length - 1]!.createdAt;
      const newCursorLastPublicId =
        convoEntriesQuery[convoEntriesQuery.length - 1]!.publicId;

      return {
        entries: convoEntriesQuery,
        cursor: {
          lastCreatedAt: newCursorLastCreatedAt,
          lastPublicId: newCursorLastPublicId
        }
      };
    }),

  getConvoSingleEntry: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos'),
        convoEntryPublicId: typeIdValidator('convoEntries')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const accountOrgMemberId = org.memberId;

      const { convoPublicId, convoEntryPublicId } = input;

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
        participant.team?.members.forEach((teamMember) => {
          teamMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(teamMember.orgMemberId);
        });
      });

      if (!convoParticipantsOrgMemberIds.includes(accountOrgMemberId)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this conversation'
        });
      }

      // get the entries
      const convoEntryQuery = await db.query.convoEntries.findFirst({
        where: and(
          eq(convoEntries.orgId, orgId),
          eq(convoEntries.convoId, convoDetails.id),
          eq(convoEntries.publicId, convoEntryPublicId)
        ),
        columns: {
          publicId: true,
          createdAt: true,
          body: true,
          type: true,
          metadata: true,
          bodyPlainText: true
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
              type: true
            }
          },
          author: {
            columns: {
              publicId: true
            }
          },
          rawHtml: {
            columns: {
              wipeDate: true,
              keep: true
            }
          }
        }
      });

      if (!convoEntryQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Convo Entry not found'
        });
      }
      // for each of the email.to, email.cc and email.from arrays from the metadata, set all entries.id fields to 0

      if (convoEntryQuery.metadata?.email) {
        if (convoEntryQuery.metadata.email.to) {
          convoEntryQuery.metadata.email.to.forEach((to) => {
            to.id = 0;
          });
        }
        if (convoEntryQuery.metadata.email.cc) {
          convoEntryQuery.metadata.email.cc.forEach((cc) => {
            cc.id = 0;
          });
        }
        if (convoEntryQuery.metadata.email.from) {
          convoEntryQuery.metadata.email.from.forEach((from) => {
            from.id = 0;
          });
        }
      }

      return {
        entry: convoEntryQuery
      };
    }),
  getConvoSingleEntryRawEmail: orgProcedure
    .input(
      z.object({
        convoEntryPublicId: typeIdValidator('convoEntries')
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const accountOrgMemberId = org.memberId;

      const { convoEntryPublicId } = input;

      // get the entries
      const convoEntryQuery = await db.query.convoEntries.findFirst({
        where: and(
          eq(convoEntries.orgId, orgId),
          eq(convoEntries.publicId, convoEntryPublicId)
        ),
        columns: {
          publicId: true,
          convoId: true
        },
        with: {
          rawHtml: {
            columns: {
              wipeDate: true,
              keep: true,
              headers: true,
              html: true,
              wiped: true
            }
          }
        }
      });

      if (!convoEntryQuery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Convo Entry not found'
        });
      }

      // check if the conversation belongs to the same org, early return if not before multiple db selects
      const convoResponse = await db.query.convos.findFirst({
        where: and(
          eq(convos.id, convoEntryQuery.convoId),
          eq(convos.orgId, orgId)
        ),
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
        participant.team?.members.forEach((teamMember) => {
          teamMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(teamMember.orgMemberId);
        });
      });

      if (!convoParticipantsOrgMemberIds.includes(accountOrgMemberId)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a participant of this conversation'
        });
      }

      return {
        rawEmailData: convoEntryQuery.rawHtml
      };
    })
});
