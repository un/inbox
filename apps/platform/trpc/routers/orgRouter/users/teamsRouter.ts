import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { addOrgMemberToTeamHandler } from './teamsHandler';
import { teams } from '@u22n/database/schema';
import { uiColors } from '@u22n/utils/colors';
import { eq, and } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const teamsRouter = router({
  createTeam: orgAdminProcedure
    .input(
      z.object({
        teamName: z.string().min(2).max(50),
        teamDescription: z.string().min(0).max(500).optional(),
        teamColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const orgId = org.id;
      const { teamName, teamDescription, teamColor } = input;
      const newPublicId = typeIdGenerator('teams');

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
  getOrgTeams: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;
    const orgId = org.id;

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
      const { db, org } = ctx;
      const orgId = org.id;

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
          },
          authorizedEmailIdentities: {
            columns: {},
            with: {
              emailIdentity: {
                columns: {
                  username: true,
                  sendName: true,
                  domainName: true
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
  addOrgMemberToTeam: orgAdminProcedure
    .input(
      z.object({
        teamPublicId: typeIdValidator('teams'),
        orgMemberPublicId: typeIdValidator('orgMembers')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { org, db } = ctx;
      const { teamPublicId, orgMemberPublicId } = input;

      const newTeamMemberPublicId = await addOrgMemberToTeamHandler(db, {
        orgId: org.id,
        teamPublicId: teamPublicId,
        orgMemberPublicId: orgMemberPublicId,
        orgMemberId: org.memberId
      });

      return {
        publicId: newTeamMemberPublicId
      };
    }),
  updateTeamMembers: orgAdminProcedure
    .input(
      z.object({
        teamPublicId: typeIdValidator('teams'),
        orgMemberPublicIds: z.array(typeIdValidator('orgMembers'))
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { org, db } = ctx;
      const { teamPublicId } = input;

      const teamMembers = await db.query.teams.findFirst({
        where: and(eq(teams.publicId, teamPublicId), eq(teams.orgId, org.id)),
        columns: {},
        with: {
          members: {
            columns: {},
            with: {
              orgMember: {
                columns: {
                  publicId: true
                }
              }
            }
          }
        }
      });
      if (!teamMembers) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team not found'
        });
      }
      // const currentMembers = teamMembers.members.map(
      //   (m) => m.orgMember.publicId
      // );
      // const newMembers = orgMemberPublicIds.filter(
      //   (m) => !currentMembers.includes(m)
      // );
      // const removedMembers = currentMembers.filter(
      //   (m) => !orgMemberPublicIds.includes(m)
      // );

      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Not implemented'
      });
    })
});
