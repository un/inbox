import { router, orgProcedure } from '~platform/trpc/trpc';
import { z } from 'zod';

import { convoStatuses, spaces, spaceStatuses } from '@u22n/database/schema';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { spaceStatusArray } from '@u22n/utils/spaces';
import { isOrgMemberSpaceMember } from './utils';
import { uiColors } from '@u22n/utils/colors';
import { eq, and } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';

export const spaceStatusesRouter = router({
  getSpacesStatuses: orgProcedure
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

      const spaceStatusesQueryResponse =
        await ctx.db.query.spaceStatuses.findMany({
          where: and(
            eq(spaceStatuses.orgId, ctx.org.id),
            eq(spaceStatuses.spaceId, spaceQueryResponse.id)
          ),
          columns: {
            publicId: true,
            name: true,
            description: true,
            type: true,
            icon: true,
            color: true,
            order: true,
            disabled: true
          }
        });

      const openStatuses = spaceStatusesQueryResponse
        .filter((status) => status.type === 'open')
        .sort((a, b) => a.order - b.order);
      const activeStatuses = spaceStatusesQueryResponse
        .filter((status) => status.type === 'active')
        .sort((a, b) => a.order - b.order);
      const closedStatuses = spaceStatusesQueryResponse
        .filter((status) => status.type === 'closed')
        .sort((a, b) => a.order - b.order);

      return {
        open: openStatuses,
        active: activeStatuses,
        closed: closedStatuses
      };
    }),
  addNewSpaceStatus: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        type: z.enum(spaceStatusArray),
        order: z.number(),
        name: z.string().min(1).max(32),
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

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      try {
        await db.insert(spaceStatuses).values({
          orgId: orgId,
          spaceId: spaceMembershipResponse.spaceId,
          publicId: typeIdGenerator('spaceStatuses'),
          type: input.type,
          name: input.name,
          color: input.color,
          description: input.description,
          order: input.order,
          createdByOrgMemberId: org.memberId
        });
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while creating the new Space Status'
        });
      }

      return {
        success: true
      };
    }),
  editSpaceStatus: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceStatusPublicId: typeIdValidator('spaceStatuses'),
        name: z.string().min(1).max(32),
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

      if (spaceMembershipResponse.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this Space'
        });
      }

      try {
        await db
          .update(spaceStatuses)
          .set({
            name: input.name,
            color: input.color,
            description: input.description
          })
          .where(
            and(
              eq(spaceStatuses.orgId, orgId),
              eq(spaceStatuses.spaceId, spaceMembershipResponse.spaceId),
              eq(spaceStatuses.publicId, input.spaceStatusPublicId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while saving the Space Status changes'
        });
      }

      return {
        success: true
      };
    }),
  disableSpaceStatus: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceStatusPublicId: typeIdValidator('spaceStatuses'),
        disable: z.boolean()
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
          .update(spaceStatuses)
          .set({
            disabled: input.disable
          })
          .where(
            and(
              eq(spaceStatuses.orgId, orgId),
              eq(spaceStatuses.spaceId, spaceMembershipResponse.spaceId),
              eq(spaceStatuses.publicId, input.spaceStatusPublicId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while saving the Space Status changes'
        });
      }

      return {
        success: true
      };
    }),
  deleteSpaceStatus: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceStatusPublicId: typeIdValidator('spaceStatuses'),
        replacementSpaceStatusPublicId: typeIdValidator('spaceStatuses')
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

      const spaceStatusQueryResponse = await db.query.spaceStatuses.findFirst({
        where: and(
          eq(spaceStatuses.orgId, orgId),
          eq(spaceStatuses.publicId, input.spaceStatusPublicId),
          eq(spaceStatuses.spaceId, spaceMembershipResponse.spaceId)
        ),
        columns: {
          id: true
        }
      });

      if (!spaceStatusQueryResponse?.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We cant find the Space Status, try again'
        });
      }

      const replacementSpaceStatusQueryResponse =
        await db.query.spaceStatuses.findFirst({
          where: and(
            eq(spaceStatuses.orgId, orgId),
            eq(spaceStatuses.publicId, input.replacementSpaceStatusPublicId),
            eq(spaceStatuses.spaceId, spaceMembershipResponse.spaceId)
          ),
          columns: {
            id: true
          }
        });

      if (!replacementSpaceStatusQueryResponse?.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We cant find the replacement Space Status, try again'
        });
      }

      try {
        await db
          .update(convoStatuses)
          .set({
            status: replacementSpaceStatusQueryResponse.id
          })
          .where(
            and(
              eq(convoStatuses.orgId, orgId),
              eq(convoStatuses.status, spaceStatusQueryResponse.id)
            )
          );

        await db
          .delete(spaceStatuses)
          .where(
            and(
              eq(spaceStatuses.orgId, orgId),
              eq(spaceStatuses.id, spaceStatusQueryResponse.id)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while setting the replacement Space Status'
        });
      }

      return {
        success: true
      };
    })
});
