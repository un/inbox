import { z } from 'zod';
import { router, orgProcedure } from '../../trpc';
import { and, desc, eq, lt, or } from '@u22n/database/orm';
import { convos, convoEntries } from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import { TRPCError } from '@trpc/server';

export const convoEntryRouter = router({
  getConvoEntries: orgProcedure
    .input(
      z.object({
        convoPublicId: typeIdValidator('convos'),
        cursorLastCreatedAt: z.date().optional(),
        cursorLastPublicId: typeIdValidator('convoEntries').optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;

      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account is not a member of the organization'
        });
      }

      const orgId = org.id;
      const accountOrgMemberId = org.memberId;

      const { convoPublicId, cursorLastCreatedAt, cursorLastPublicId } = input;
      const inputLastCreatedAt = cursorLastCreatedAt
        ? new Date(cursorLastCreatedAt)
        : new Date();
      const inputLastPublicId = cursorLastPublicId || 'ce_';

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
        participant.group?.members.forEach((groupMember) => {
          groupMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(groupMember.orgMemberId);
        });
      });

      if (!convoParticipantsOrgMemberIds.includes(accountOrgMemberId)) {
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
      convoEntriesQuery.forEach((entry) => {
        if (entry.metadata?.email) {
          if (entry.metadata.email.to) {
            entry.metadata.email.to.forEach((to) => {
              to.id = 0;
            });
          }
          if (entry.metadata.email.cc) {
            entry.metadata.email.cc.forEach((cc) => {
              cc.id = 0;
            });
          }
          if (entry.metadata.email.from) {
            entry.metadata.email.from.forEach((from) => {
              from.id = 0;
            });
          }
        }
      });

      return {
        entries: convoEntriesQuery
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

      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account is not a member of the organization'
        });
      }

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
        participant.group?.members.forEach((groupMember) => {
          groupMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(groupMember.orgMemberId);
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

      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      if (!org?.memberId) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account is not a member of the organization'
        });
      }

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
        participant.group?.members.forEach((groupMember) => {
          groupMember.orgMemberId &&
            convoParticipantsOrgMemberIds.push(groupMember.orgMemberId);
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
