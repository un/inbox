import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@u22n/database/orm';
import { teams } from '@u22n/database/schema';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils';
import { uiColors } from '@u22n/types/ui';
import { isAccountAdminOfOrg } from '../../../../utils/account';
import { TRPCError } from '@trpc/server';
import { addOrgMemberToTeamHandler } from './teamsHandler';

export const teamsRouter = router({
  createTeam: orgProcedure
    .input(
      z.object({
        teamName: z.string().min(2).max(50),
        teamDescription: z.string().min(0).max(500).optional(),
        teamColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;

      const orgId = org?.id;
      const { teamName, teamDescription, teamColor } = input;
      const newPublicId = typeIdGenerator('teams');

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db.insert(teams).values({
        publicId: newPublicId,
        name: teamName,
        description: teamDescription,
        color: teamColor,
        orgId: orgId
      });

      return {
        newTeamPublicId: newPublicId
      };
    }),
  getOrgTeams: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      const teamQuery = await db.query.teams.findMany({
        columns: {
          publicId: true,
          avatarTimestamp: true,
          name: true,
          description: true,
          color: true
        },
        where: and(eq(teams.orgId, orgId)),
        with: {
          members: {
            columns: {
              publicId: true,
              id: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              },
              orgMemberProfile: {
                columns: {
                  publicId: true,
                  avatarTimestamp: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true
                }
              }
            }
          }
        }
      });

      return {
        teams: teamQuery
      };
    }),
  getTeam: orgProcedure
    .input(
      z.object({
        teamPublicId: typeIdValidator('teams'),
        newTeam: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;
      const orgId = org?.id;

      // Handle when adding database replicas
      const dbReplica = db;

      const teamQuery = await dbReplica.query.teams.findFirst({
        columns: {
          publicId: true,
          avatarTimestamp: true,
          name: true,
          description: true,
          color: true
        },
        where: and(
          eq(teams.publicId, input.teamPublicId),
          eq(teams.orgId, orgId)
        ),
        with: {
          members: {
            columns: {
              role: true,
              notifications: true,
              publicId: true
            },
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              },
              orgMemberProfile: {
                columns: {
                  publicId: true,
                  avatarTimestamp: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true
                }
              }
            }
          }
        }
      });

      return {
        team: teamQuery
      };
    }),
  addOrgMemberToTeam: orgProcedure
    .input(
      z.object({
        teamPublicId: typeIdValidator('teams'),
        orgMemberPublicId: typeIdValidator('orgMembers')
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { org } = ctx;
      const { teamPublicId, orgMemberPublicId } = input;

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      const newTeamMemberPublicId = await addOrgMemberToTeamHandler({
        orgId: org.id,
        teamPublicId: teamPublicId,
        orgMemberPublicId: orgMemberPublicId,
        orgMemberId: org.memberId
      });

      return {
        publicId: newTeamMemberPublicId
      };
    })
});
