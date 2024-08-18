import { router, orgProcedure } from '~platform/trpc/trpc';
import { z } from 'zod';

import { convoWorkflows, spaces, spaceWorkflows } from '@u22n/database/schema';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { spaceWorkflowArray } from '@u22n/utils/spaces';
import { isOrgMemberSpaceMember } from './utils';
import { uiColors } from '@u22n/utils/colors';
import { eq, and } from '@u22n/database/orm';
import { TRPCError } from '@trpc/server';

export const spaceWorkflowsRouter = router({
  getSpacesWorkflows: orgProcedure
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

      const spaceWorkflowsQueryResponse =
        await ctx.db.query.spaceWorkflows.findMany({
          where: and(
            eq(spaceWorkflows.orgId, ctx.org.id),
            eq(spaceWorkflows.spaceId, spaceQueryResponse.id)
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

      const openWorkflows = spaceWorkflowsQueryResponse
        .filter((workflow) => workflow.type === 'open')
        .sort((a, b) => a.order - b.order);
      const activeWorkflows = spaceWorkflowsQueryResponse
        .filter((workflow) => workflow.type === 'active')
        .sort((a, b) => a.order - b.order);
      const closedWorkflows = spaceWorkflowsQueryResponse
        .filter((workflow) => workflow.type === 'closed')
        .sort((a, b) => a.order - b.order);

      return {
        open: openWorkflows,
        active: activeWorkflows,
        closed: closedWorkflows
      };
    }),
  enableSpacesWorkflows: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const spaceLookup = await isOrgMemberSpaceMember({
        db,
        orgId: org.id,
        spaceShortcode: input.spaceShortcode,
        orgMemberId: org.memberId
      });

      // check if the space already has workflows
      const spaceWorkflowsQueryResponse =
        await ctx.db.query.spaceWorkflows.findMany({
          where: and(
            eq(spaceWorkflows.orgId, ctx.org.id),
            eq(spaceWorkflows.spaceId, spaceLookup.spaceId)
          ),
          columns: {
            id: true
          }
        });

      if (spaceWorkflowsQueryResponse.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Space already has workflows'
        });
      }

      type WorkflowInsert = typeof spaceWorkflows.$inferInsert;
      const initialWorkflows: WorkflowInsert[] = [
        {
          publicId: typeIdGenerator('spaceWorkflows'),
          orgId: org.id,
          spaceId: spaceLookup.spaceId,
          name: 'New',
          description: '',
          type: 'open',
          icon: 'circle',
          color: 'blue',
          order: 1,
          disabled: false,
          createdByOrgMemberId: org.memberId
        },
        {
          publicId: typeIdGenerator('spaceWorkflows'),
          orgId: org.id,
          spaceId: spaceLookup.spaceId,
          name: 'In Progress',
          description: '',
          type: 'active',
          icon: 'circle',
          color: 'orange',
          order: 1,
          disabled: false,
          createdByOrgMemberId: org.memberId
        },
        {
          publicId: typeIdGenerator('spaceWorkflows'),
          orgId: org.id,
          spaceId: spaceLookup.spaceId,
          name: 'Completed',
          description: '',
          type: 'closed',
          icon: 'circle',
          color: 'jade',
          order: 1,
          disabled: false,
          createdByOrgMemberId: org.memberId
        }
      ];

      await db.insert(spaceWorkflows).values(initialWorkflows);

      return {
        success: true
      };
    }),
  addNewSpaceWorkflow: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        type: z.enum(spaceWorkflowArray),
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
        await db.insert(spaceWorkflows).values({
          orgId: orgId,
          spaceId: spaceMembershipResponse.spaceId,
          publicId: typeIdGenerator('spaceWorkflows'),
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
          message: 'Error while creating the new Space Workflow'
        });
      }

      return {
        success: true
      };
    }),
  editSpaceWorkflow: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceWorkflowPublicId: typeIdValidator('spaceWorkflows'),
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
          .update(spaceWorkflows)
          .set({
            name: input.name,
            color: input.color,
            description: input.description
          })
          .where(
            and(
              eq(spaceWorkflows.orgId, orgId),
              eq(spaceWorkflows.spaceId, spaceMembershipResponse.spaceId),
              eq(spaceWorkflows.publicId, input.spaceWorkflowPublicId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while saving the Space Workflow changes'
        });
      }

      return {
        success: true
      };
    }),
  disableSpaceWorkflow: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceWorkflowPublicId: typeIdValidator('spaceWorkflows'),
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
          .update(spaceWorkflows)
          .set({
            disabled: input.disable
          })
          .where(
            and(
              eq(spaceWorkflows.orgId, orgId),
              eq(spaceWorkflows.spaceId, spaceMembershipResponse.spaceId),
              eq(spaceWorkflows.publicId, input.spaceWorkflowPublicId)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while saving the Space Workflow changes'
        });
      }

      return {
        success: true
      };
    }),
  deleteSpaceWorkflow: orgProcedure
    .input(
      z.object({
        spaceShortcode: z.string().min(1).max(64),
        spaceWorkflowPublicId: typeIdValidator('spaceWorkflows'),
        replacementSpaceWorkflowPublicId: typeIdValidator('spaceWorkflows')
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

      const spaceWorkflowQueryResponse =
        await db.query.spaceWorkflows.findFirst({
          where: and(
            eq(spaceWorkflows.orgId, orgId),
            eq(spaceWorkflows.publicId, input.spaceWorkflowPublicId),
            eq(spaceWorkflows.spaceId, spaceMembershipResponse.spaceId)
          ),
          columns: {
            id: true
          }
        });

      if (!spaceWorkflowQueryResponse?.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We cant find the Space Workflow, try again'
        });
      }

      const replacementSpaceWorkflowQueryResponse =
        await db.query.spaceWorkflows.findFirst({
          where: and(
            eq(spaceWorkflows.orgId, orgId),
            eq(spaceWorkflows.publicId, input.replacementSpaceWorkflowPublicId),
            eq(spaceWorkflows.spaceId, spaceMembershipResponse.spaceId)
          ),
          columns: {
            id: true
          }
        });

      if (!replacementSpaceWorkflowQueryResponse?.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We cant find the replacement Space Workflow, try again'
        });
      }

      try {
        await db
          .update(convoWorkflows)
          .set({
            workflow: replacementSpaceWorkflowQueryResponse.id
          })
          .where(
            and(
              eq(convoWorkflows.orgId, orgId),
              eq(convoWorkflows.workflow, spaceWorkflowQueryResponse.id)
            )
          );

        await db
          .delete(spaceWorkflows)
          .where(
            and(
              eq(spaceWorkflows.orgId, orgId),
              eq(spaceWorkflows.id, spaceWorkflowQueryResponse.id)
            )
          );
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error while setting the replacement Space Workflow'
        });
      }

      return {
        success: true
      };
    })
});
