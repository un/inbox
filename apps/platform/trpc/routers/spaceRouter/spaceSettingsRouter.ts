import { iCanHazCallerFactory } from '../orgRouter/iCanHaz/iCanHazRouter';
import { router, orgProcedure } from '~platform/trpc/trpc';
import { spaceTypeArray } from '@u22n/utils/spaces';
import { isOrgMemberSpaceMember } from './utils';
import { spaces } from '@u22n/database/schema';
import { uiColors } from '@u22n/utils/colors';
import { eq, and } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const spaceSettingsRouter = router({
  getSpacesSettings: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64)
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (!spaceMembershipResponse.role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "You don't have access to settings for this space"
        });
      }

      const spaceQueryResponse = await db.query.spaces.findFirst({
        where: and(
          eq(spaces.orgId, ctx.org.id),
          eq(spaces.shortcode, input.spaceShortcode)
        ),
        columns: {
          publicId: true,
          shortcode: true,
          name: true,
          description: true,
          type: true,
          avatarTimestamp: true,
          convoPrefix: true,
          inheritParentPermissions: true,
          color: true,
          icon: true,
          personalSpace: true,
          createdAt: true
        },
        with: {
          parentSpace: {
            columns: {
              publicId: true,
              shortcode: true,
              name: true,
              description: true,
              color: true,
              icon: true,
              avatarTimestamp: true
            }
          },
          subSpaces: {
            columns: {
              publicId: true,
              shortcode: true,
              name: true,
              description: true,
              color: true,
              icon: true,
              avatarTimestamp: true
            }
          },
          createdByOrgMember: {
            columns: {
              publicId: true
            },
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarTimestamp: true,
                  firstName: true,
                  lastName: true,
                  handle: true,
                  title: true,
                  blurb: true
                }
              }
            }
          }
        }
      });
      return {
        settings: spaceQueryResponse,
        role: spaceMembershipResponse.role
      };
    }),
  setSpaceName: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceName: z.string().min(1).max(64)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      try {
        await db
          .update(spaces)
          .set({
            name: input.spaceName
          })
          .where(
            and(
              eq(spaces.orgId, orgId),
              eq(spaces.id, spaceMembershipResponse.spaceId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while updating Space name'
        });
      }

      return {
        success: true
      };
    }),
  setSpaceDescription: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceDescription: z.string().min(1).max(64)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      try {
        await db
          .update(spaces)
          .set({
            description: input.spaceDescription
          })
          .where(
            and(
              eq(spaces.orgId, orgId),
              eq(spaces.id, spaceMembershipResponse.spaceId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while updating Space description'
        });
      }

      return {
        success: true
      };
    }),
  setSpaceColor: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceColor: z.enum(uiColors)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      try {
        await db
          .update(spaces)
          .set({
            color: input.spaceColor
          })
          .where(
            and(
              eq(spaces.orgId, orgId),
              eq(spaces.id, spaceMembershipResponse.spaceId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while updating Space description'
        });
      }

      return {
        success: true
      };
    }),
  setSpaceType: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceType: z.enum(spaceTypeArray)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;

      const spaceMembershipResponse = await isOrgMemberSpaceMember({
        db,
        orgId,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      if (
        spaceMembershipResponse.isPersonalSpace &&
        input.spaceType === 'open'
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot change the type of a personal space to open'
        });
      }

      if (
        !spaceMembershipResponse.isPersonalSpace &&
        input.spaceType === 'private'
      ) {
        const iCanHazCaller = iCanHazCallerFactory(ctx);
        const canHazSpace = await iCanHazCaller.space({
          orgShortcode: input.orgShortcode
        });

        if (input.spaceType === 'private' && !canHazSpace.private) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'You cannot change the type of a space to private on your current plan'
          });
        }
      }

      try {
        await db
          .update(spaces)
          .set({
            type: input.spaceType
          })
          .where(
            and(
              eq(spaces.orgId, orgId),
              eq(spaces.id, spaceMembershipResponse.spaceId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while updating Space type'
        });
      }

      return {
        success: true
      };
    })
});
