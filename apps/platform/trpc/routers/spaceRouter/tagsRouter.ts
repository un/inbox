import { router, orgProcedure } from '~platform/trpc/trpc';
import { z } from 'zod';

import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { spaces, spaceTags } from '@u22n/database/schema';
import { isOrgMemberSpaceMember } from './utils';
import { uiColors } from '@u22n/utils/colors';
import { eq, and } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';

export const spaceTagsRouter = router({
  getSpacesTags: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64)
      })
    )
    .query(async ({ ctx, input }) => {
      const spaceQueryResponse = await ctx.db.query.spaces.findFirst({
        where: and(
          eq(spaces.orgId, ctx.org.id),
          eq(spaces.shortcode, input.spaceShortcode)
        ),
        columns: {
          id: true
        }
      });

      if (!spaceQueryResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Space not found'
        });
      }

      const spaceTagsQueryResponse = await ctx.db.query.spaceTags.findMany({
        where: and(
          eq(spaceTags.orgId, ctx.org.id),
          eq(spaceTags.spaceId, spaceQueryResponse.id)
        ),
        columns: {
          publicId: true,
          label: true,
          description: true,
          icon: true,
          color: true,
          disabled: true
        }
      });

      return spaceTagsQueryResponse;
    }),
  addNewSpaceTag: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        label: z.string().min(1).max(32),
        color: z.enum(uiColors),
        description: z.string().optional()
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

      if (!spaceMembershipResponse.role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to add tags to this Space'
        });
      }

      try {
        await db.insert(spaceTags).values({
          orgId: orgId,
          spaceId: spaceMembershipResponse.spaceId,
          publicId: typeIdGenerator('spaceTags'),
          label: input.label,
          color: input.color,
          description: input.description,
          createdByOrgMemberId: org.memberId
        });
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while creating the new Tag'
        });
      }

      return {
        success: true
      };
    }),
  editSpaceTag: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceTagPublicId: typeIdValidator('spaceTags'),
        label: z.string().min(1).max(32),
        color: z.enum(uiColors),
        description: z.string().optional()
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

      if (!spaceMembershipResponse.role) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Tag'
        });
      }

      try {
        await db
          .update(spaceTags)
          .set({
            label: input.label,
            color: input.color,
            description: input.description
          })
          .where(
            and(
              eq(spaceTags.orgId, orgId),
              eq(spaceTags.spaceId, spaceMembershipResponse.spaceId),
              eq(spaceTags.publicId, input.spaceTagPublicId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while saving the Tag changes'
        });
      }

      return {
        success: true
      };
    })
});
