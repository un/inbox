import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@u22n/database/orm';
import { spaceMembers, spaces, teams } from '@u22n/database/schema';
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
        teamColor: z.enum(uiColors),
        spacePublicId: typeIdValidator('spaces').optional(),
        orgMembersPublicIds: z.array(typeIdValidator('orgMembers')).optional()
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

      const orgId = org.id;
      const orgMemberId = org.memberId;
      const { teamName, teamDescription, teamColor } = input;
      const newPublicId = typeIdGenerator('teams');

      const isAdmin = await isAccountAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      let spaceId: number | null = null;
      if (input.spacePublicId) {
        const spaceQuery = await db.query.spaces.findFirst({
          columns: {
            id: true
          },
          where: and(
            eq(spaces.publicId, input.spacePublicId),
            eq(spaces.orgId, orgId)
          )
        });
        if (spaceQuery) {
          spaceId = spaceQuery.id;
        }
      } else {
        let newSpaceShortcode = teamName.toLowerCase().replace(/\s/g, '-');

        const existingShortcodeQuery = await db.query.spaces.findMany({
          columns: {
            shortcode: true
          },
          where: and(
            eq(spaces.orgId, orgId),
            eq(spaces.shortcode, newSpaceShortcode)
          )
        });
        if (existingShortcodeQuery.length > 0) {
          newSpaceShortcode = `${newSpaceShortcode}-${existingShortcodeQuery.length}`;
        }

        const newSpacePublicId = typeIdGenerator('spaces');
        const newSpaceInsertResponse = await db.insert(spaces).values({
          orgId: orgId,
          publicId: newSpacePublicId,
          type: 'shared',
          description: `${teamName}'s Space`,
          name: `${teamName}'s Space`,
          createdBy: orgMemberId,
          shortcode: newSpaceShortcode
        });

        spaceId = Number(newSpaceInsertResponse.insertId);
      }

      const teamInsertResponse = await db.insert(teams).values({
        publicId: newPublicId,
        name: teamName,
        description: teamDescription,
        color: teamColor,
        orgId: orgId,
        defaultSpaceId: spaceId!
      });

      if (!teamInsertResponse.insertId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error creating team'
        });
      }

      await db.insert(spaceMembers).values({
        orgId: orgId,
        publicId: typeIdGenerator('spaceMembers'),
        spaceId: spaceId!,
        orgMemberId: orgMemberId,
        teamId: Number(teamInsertResponse.insertId),
        role: 'admin',
        addedBy: orgMemberId
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
