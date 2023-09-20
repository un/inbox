import { z } from 'zod';
import { router, protectedProcedure, limitedProcedure } from '../../trpc';
import { and, eq, or } from '@uninbox/database/orm';
import {
  orgInvitations,
  orgMembers,
  orgs,
  userProfiles,
  userProfilesToOrgs
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdToken } from '@uninbox/utils';

export const invitesRouter = router({
  createNewInvite: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength),
        role: z.enum(['admin', 'member']),
        inviteeEmail: z.string().email()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user } = ctx;
      const { inviteeEmail, orgPublicId, role } = input;
      const newPublicId = nanoId();
      const userId = user.userId || 0;

      const newInviteToken = nanoIdToken();

      // TODO: make this part of the insert query as subquery
      const orgIdResponse = await db.read
        .select({ id: orgs.id })
        .from(orgs)
        .where(eq(orgs.publicId, input.orgPublicId));
      await db.write.insert(orgInvitations).values({
        orgId: orgIdResponse[0].id,
        invitedByUserId: userId,
        publicId: newPublicId,
        role: role,
        email: inviteeEmail,
        inviteToken: newInviteToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Days from now
      });

      return {
        success: true,
        orgId: orgPublicId,
        inviteId: newPublicId,
        inviteToken: newInviteToken,
        error: null
      };
    }),
  viewInvites: protectedProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;

      const orgInvitesResponse = await db.read.query.orgInvitations.findMany({
        where: eq(
          orgInvitations.orgId,
          db.read
            .select({ id: orgs.id })
            .from(orgs)
            .where(eq(orgs.publicId, input.orgPublicId))
        ),
        columns: {
          publicId: true,
          role: true,
          inviteToken: true,
          invitedAt: true,
          expiresAt: true,
          acceptedAt: true,
          email: true
        },
        with: {
          invitedByUser: {
            columns: {},
            with: {
              orgMemberships: {
                columns: {},
                where: eq(
                  orgMembers.orgId,
                  db.read
                    .select({ id: orgs.id })
                    .from(orgs)
                    .where(eq(orgs.publicId, input.orgPublicId))
                ),
                with: {
                  profile: {
                    columns: {
                      firstName: true,
                      lastName: true,
                      avatarId: true
                    }
                  }
                }
              }
            }
          },
          invitedUser: {
            columns: {},
            with: {
              orgMemberships: {
                columns: {},
                where: eq(
                  orgMembers.orgId,
                  db.read
                    .select({ id: orgs.id })
                    .from(orgs)
                    .where(eq(orgs.publicId, input.orgPublicId))
                ),
                with: {
                  profile: {
                    columns: {
                      firstName: true,
                      lastName: true,
                      avatarId: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      return {
        invites: orgInvitesResponse
      };
    }),

  validateInvite: limitedProcedure
    .input(
      z.object({
        inviteToken: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      const queryInvitesResponse = await db.read
        .select({ id: orgInvitations.id })
        .from(orgInvitations)
        .where(eq(orgInvitations.inviteToken, input.inviteToken));

      if (queryInvitesResponse.length === 0) {
        return {
          valid: false
        };
      }

      return {
        valid: true
      };
    }),
  redeemInvite: protectedProcedure
    .input(
      z.object({
        inviteToken: z.string().min(3).max(32),
        profilePublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const newPublicId = nanoId();
      const userId = ctx.user.userId || 0;

      const queryInvitesResponse = await db.read
        .select({
          id: orgInvitations.id,
          orgId: orgInvitations.orgId,
          role: orgInvitations.role,
          invitedByUserId: orgInvitations.invitedByUserId
        })
        .from(orgInvitations)
        .where(eq(orgInvitations.inviteToken, input.inviteToken));

      if (queryInvitesResponse.length === 0) {
        return {
          success: false,
          error: 'Invalid invite token'
        };
      }

      const userProfileResponse = input.profilePublicId
        ? await db.read
            .select({ id: userProfiles.id })
            .from(userProfiles)
            .where(eq(userProfiles.publicId, input.profilePublicId))
        : await db.read
            .select({ id: userProfiles.id })
            .from(userProfiles)
            .where(
              and(
                eq(userProfiles.userId, userId),
                eq(userProfiles.defaultProfile, true)
              )
            );

      await db.write.update(orgInvitations).set({
        acceptedAt: new Date(),
        invitedUser: userId
      });

      await db.write.insert(orgMembers).values({
        userId: userId,
        orgId: +queryInvitesResponse[0].orgId,
        invitedByUserId: +queryInvitesResponse[0].invitedByUserId,
        status: 'active',
        role: queryInvitesResponse[0].role,
        userProfileId: userProfileResponse[0].id
      });

      await db.write.insert(userProfilesToOrgs).values({
        userProfileId: userProfileResponse[0].id,
        orgId: +queryInvitesResponse[0].orgId
      });

      return {
        success: true,
        error: null
      };
    }),
  deleteInvite: protectedProcedure
    .input(
      z.object({
        invitePublicId: z.string().min(3).max(nanoIdLength)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      await db.write
        .delete(orgInvitations)
        .where(eq(orgInvitations.publicId, input.invitePublicId));

      return {
        success: true
      };
    })
});
