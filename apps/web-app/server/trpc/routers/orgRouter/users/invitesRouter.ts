import { z } from 'zod';
import {
  router,
  orgProcedure,
  limitedProcedure,
  userProcedure
} from '../../../trpc';
import { and, eq, inArray, or } from '@uninbox/database/orm';
import {
  domains,
  emailIdentities,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentitiesAuthorizedUsers,
  orgInvitations,
  orgMembers,
  orgs,
  userGroupMembers,
  userGroups,
  userProfiles,
  userProfilesToOrgs,
  users
} from '@uninbox/database/schema';
import {
  nanoId,
  nanoIdLength,
  nanoIdToken,
  nanoIdSchema
} from '@uninbox/utils';
import { refreshOrgSlugCache } from '~/server/utils/orgSlug';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const invitesRouter = router({
  createNewInvite: orgProcedure
    .input(
      z.object({
        user: z.object({
          firstName: z.string().min(1).max(64),
          lastName: z.string().min(1).max(64).optional(),
          title: z.string().min(1).max(64).optional(),
          role: z.enum(['admin', 'member'])
        }),
        notification: z
          .object({
            notificationEmailAddress: z.string().email()
          })
          .optional(),
        email: z
          .object({
            emailUsername: z.string().min(1).max(64),
            domainPublicId: nanoIdSchema,
            sendName: z.string().min(1).max(64)
          })
          .optional(),
        groups: z
          .object({
            groupsPublicIds: z.string().min(3).max(64).array()
          })
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const orgMemberId = org?.memberId || 0;

      const { user: userInput, notification, email, groups } = input;

      // Insert user profile - save ID

      const userProfilePublicId = nanoId();
      const userProfileResponse = await db.insert(userProfiles).values({
        publicId: userProfilePublicId,
        firstName: userInput.firstName,
        lastName: userInput.lastName || '',
        title: userInput.title || '',
        handle: '',
        defaultProfile: true
      });
      const userProfileId = +userProfileResponse.insertId;
      await db.insert(userProfilesToOrgs).values({
        userProfileId: userProfileId,
        orgId: orgId
      });

      // Insert orgMember - save ID
      const orgMemberPublicId = nanoId();
      const orgMemberResponse = await db.insert(orgMembers).values({
        publicId: orgMemberPublicId,
        orgId: orgId,
        invitedByOrgMemberId: orgMemberId,
        status: 'invited',
        role: userInput.role,
        userProfileId: userProfileId
      });

      // Insert groupMemberships - save ID
      if (groups) {
        const groupIds = await db.query.userGroups.findMany({
          where: inArray(userGroups.publicId, groups.groupsPublicIds),
          columns: {
            id: true
          }
        });

        // Fix type any
        const newGroupMembershipValues = groupIds.map((group) => ({
          publicId: nanoId(),
          orgMemberId: +orgMemberResponse.insertId,
          groupId: group.id,
          userProfileId: userProfileId,
          addedBy: orgMemberId,
          role: 'member' as 'admin' | 'member'
        }));

        await db.insert(userGroupMembers).values([...newGroupMembershipValues]);
      }
      // Insert Email identities
      if (email) {
        const domainResponse = await db.query.domains.findFirst({
          where: eq(domains.publicId, email.domainPublicId),
          columns: {
            id: true,
            domain: true
          }
        });
        if (!domainResponse) {
          throw new TRPCError({
            code: 'UNPROCESSABLE_CONTENT',
            message: 'Domain not found'
          });
        }

        const emailRoutingRulesPublicId = nanoId();
        const emailRoutingRulesResponse = await db
          .insert(emailRoutingRules)
          .values({
            orgId: orgId,
            publicId: emailRoutingRulesPublicId,
            name: `Email routing rule for ${email.emailUsername}@${domainResponse?.domain}`,
            createdBy: orgMemberId
          });

        await db.insert(emailRoutingRulesDestinations).values({
          orgId: orgId,
          ruleId: +emailRoutingRulesResponse.insertId,
          orgMemberId: +orgMemberResponse.insertId
        });

        const emailIdentityPublicId = nanoId();
        const emailIdentityResponse = await db.insert(emailIdentities).values({
          publicId: emailIdentityPublicId,
          orgId: orgId,
          createdBy: orgMemberId,
          domainId: domainResponse?.id,
          username: email.emailUsername,
          domainName: domainResponse?.domain,
          routingRuleId: +emailRoutingRulesResponse.insertId,
          isCatchAll: false,
          sendName: email.sendName
        });

        await db.insert(emailIdentitiesAuthorizedUsers).values({
          orgId: orgId,
          identityId: +emailIdentityResponse.insertId,
          default: true,
          addedBy: orgMemberId,
          orgMemberId: +orgMemberResponse.insertId
        });
      }

      // Insert orgInvitations - save ID

      const newInvitePublicId = nanoId();
      const newInviteToken = nanoIdToken();
      await db.insert(orgInvitations).values({
        publicId: newInvitePublicId,
        orgId: orgId,
        invitedByOrgMemberId: orgMemberId,
        orgMemberId: +orgMemberResponse.insertId,
        role: userInput.role,
        email: notification?.notificationEmailAddress || null,
        inviteToken: newInviteToken,
        invitedUserProfileId: userProfileId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Days from now
      });

      //! FIX: Send email

      return {
        success: true,
        inviteId: newInvitePublicId,
        inviteToken: newInviteToken,
        error: null
      };
    }),
  viewInvites: orgProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;

      const orgInvitesResponse = await db.query.orgInvitations.findMany({
        where: eq(orgInvitations.orgId, orgId),
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
          invitedByOrgMember: {
            columns: {},
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          orgMember: {
            with: {
              profile: {
                columns: {
                  publicId: true,
                  avatarId: true,
                  firstName: true,
                  lastName: true
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
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const userLoggedIn = ctx.user?.id ? true : false;
      console.log('userLoggedIn', userLoggedIn);

      const queryInvitesResponse = await db.query.orgInvitations.findFirst({
        where: eq(orgInvitations.inviteToken, input.inviteToken),
        columns: {
          id: true,
          expiresAt: true,
          acceptedAt: true,
          orgId: true
        },
        with: {
          org: {
            columns: {
              publicId: true,
              avatarId: true,
              name: true,
              slug: true
            }
          }
        }
      });

      if (!queryInvitesResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite token'
        });
      }
      if (
        queryInvitesResponse.expiresAt &&
        queryInvitesResponse.expiresAt < new Date()
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite has expired'
        });
      }
      if (queryInvitesResponse.acceptedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invite has already been used'
        });
      }

      return {
        valid: true,
        orgPublicId: queryInvitesResponse.org.publicId,
        orgAvatarId: queryInvitesResponse.org.avatarId,
        orgName: queryInvitesResponse.org.name,
        orgSlug: queryInvitesResponse.org.slug,
        loggedIn: userLoggedIn
      };
    }),
  redeemInvite: userProcedure
    .input(
      z.object({
        inviteToken: z.string().min(3).max(32)
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User is not defined');
      }
      const { db, user } = ctx;
      const userId = user?.id;
      const newPublicId = nanoId();

      const queryInvitesResponse = await db.query.orgInvitations.findFirst({
        where: eq(orgInvitations.inviteToken, input.inviteToken),
        columns: {
          id: true,
          orgId: true,
          role: true,
          invitedByOrgMemberId: true,
          expiresAt: true,
          acceptedAt: true,
          invitedUserProfileId: true,
          orgMemberId: true
        },
        with: {
          invitedProfile: {
            columns: {
              publicId: true
            }
          },
          org: {
            columns: {
              slug: true
            }
          }
        }
      });

      const invitedUserProfilePublicId =
        queryInvitesResponse?.invitedProfile?.publicId;
      if (
        !invitedUserProfilePublicId ||
        !queryInvitesResponse.invitedUserProfileId ||
        !queryInvitesResponse.orgMemberId
      ) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite token, please contact support'
        });
      }

      if (!queryInvitesResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invite token'
        });
      }

      if (
        queryInvitesResponse.expiresAt &&
        queryInvitesResponse.expiresAt < new Date()
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invite has expired'
        });
      }

      if (queryInvitesResponse.acceptedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invite has already been used'
        });
      }

      const userHandleQuery = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          username: true
        }
      });

      await db
        .update(userProfiles)
        .set({
          userId: userId,
          handle: userHandleQuery?.username || ''
        })
        .where(eq(userProfiles.id, +queryInvitesResponse.invitedUserProfileId));

      await db
        .update(orgMembers)
        .set({
          userId: userId,
          status: 'active',
          addedAt: new Date()
        })
        .where(eq(orgMembers.id, +queryInvitesResponse.orgMemberId));

      await db
        .update(orgInvitations)
        .set({
          acceptedAt: new Date()
        })
        .where(eq(orgInvitations.id, queryInvitesResponse.id));

      if (useRuntimeConfig().billing.enabled) {
        billingTrpcClient.stripe.subscriptions.updateOrgUserCount.mutate({
          orgId: +queryInvitesResponse.orgId
        });
      }

      await refreshOrgSlugCache(+queryInvitesResponse.orgId);

      return {
        success: true,
        orgSlug: queryInvitesResponse.org.slug
      };
    }),
  invalidateInvite: orgProcedure
    .input(
      z.object({
        invitePublicId: nanoIdSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db
        .update(orgInvitations)
        .set({
          expiresAt: new Date()
        })
        .where(eq(orgInvitations.publicId, input.invitePublicId));

      return {
        success: true
      };
    }),
  refreshInvite: orgProcedure
    .input(
      z.object({
        invitePublicId: nanoIdSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, user, org } = ctx;
      const userId = user?.id;
      const orgId = org?.id;
      const isAdmin = await isUserAdminOfOrg(org);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db
        .update(orgInvitations)
        .set({
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
        .where(eq(orgInvitations.publicId, input.invitePublicId));

      return {
        success: true
      };
    })
});
