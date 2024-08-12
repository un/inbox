import {
  typeIdGenerator,
  typeIdValidator,
  type TypeId
} from '@u22n/utils/typeid';
import { router, orgProcedure, orgAdminProcedure } from '~platform/trpc/trpc';
import { teams, spaces, spaceMembers } from '@u22n/database/schema';
import { validateSpaceShortCode } from '../../spaceRouter/utils';
import { addOrgMemberToTeamHandler } from './teamsHandler';
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
        teamColor: z.enum(uiColors),
        createSpace: z.boolean().default(false)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const orgId = org.id;
      const { teamName, teamDescription, teamColor, createSpace } = input;
      const newTeamPublicId = typeIdGenerator('teams');

      // Create the new team
      const newTeamResponse = await db.insert(teams).values({
        publicId: newTeamPublicId,
        name: teamName,
        description: teamDescription,
        color: teamColor,
        orgId: orgId
      });

      const newTeamId = newTeamResponse.insertId;

      let newSpacePublicId: TypeId<'spaces'> | undefined;
      if (createSpace) {
        newSpacePublicId = typeIdGenerator('spaces');
        const newSpaceMemberPublicId = typeIdGenerator('spaceMembers');

        const spaceShortcode = await validateSpaceShortCode({
          db: db,
          shortcode: teamName,
          orgId: orgId
        });

        // Create a space for the new team
        const newSpaceResponse = await db.insert(spaces).values({
          publicId: newSpacePublicId,
          orgId: Number(orgId),
          name: teamName,
          color: teamColor,
          createdByOrgMemberId: org.memberId,
          shortcode: spaceShortcode.shortcode,
          type: 'private',
          icon: 'squares-four'
        });

        const newSpaceId = newSpaceResponse.insertId;

        // Add the team to the space
        await db.insert(spaceMembers).values({
          publicId: newSpaceMemberPublicId,
          orgId: orgId,
          spaceId: Number(newSpaceId),
          teamId: Number(newTeamId),
          addedByOrgMemberId: org.memberId,
          role: 'admin'
        });

        await db
          .update(teams)
          .set({ defaultSpaceId: Number(newSpaceId) })
          .where(eq(teams.id, Number(newTeamId)));
      }

      return {
        newTeamPublicId: newTeamPublicId,
        newSpacePublicId: newSpacePublicId
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
          defaultEmailIdentity: {
            columns: {
              username: true,
              domainName: true,
              sendName: true
            }
          }
        }
      });

      return {
        team: teamQuery,
        defaultEmailIdentity: teamQuery?.defaultEmailIdentity
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
