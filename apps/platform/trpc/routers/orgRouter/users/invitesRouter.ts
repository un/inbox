import { z } from 'zod';
import {
  router,
  orgProcedure,
  accountProcedure,
  publicRateLimitedProcedure
} from '../../../trpc';
import { eq } from '@u22n/database/orm';
import {
  domains,
  emailIdentities,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentitiesAuthorizedOrgMembers,
  orgInvitations,
  orgMembers,
  orgMemberProfiles,
  accounts
} from '@u22n/database/schema';
import {
  nanoIdToken,
  typeIdGenerator,
  typeIdValidator,
  zodSchemas
} from '@u22n/utils';
import { refreshOrgSlugCache } from '../../../../utils/orgSlug';
import { isAccountAdminOfOrg } from '../../../../utils/account';
import { TRPCError } from '@trpc/server';
import { useRuntimeConfig } from '#imports';
import { billingTrpcClient } from '../../../../utils/tRPCServerClients';
import { addOrgMemberToGroupHandler } from './groupHandler';

export const invitesRouter = router({
  createNewInvite: orgProcedure
    .input(
      z.object({
        newOrgMember: z.object({
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
            domainPublicId: typeIdValidator('domains'),
            sendName: z.string().min(1).max(64)
          })
          .optional(),
        groups: z
          .object({
            groupsPublicIds: z.array(typeIdValidator('groups'))
          })
          .optional()
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
      const orgMemberId = org?.memberId || 0;

      const { newOrgMember, notification, email, groups: groupsInput } = input;

      // Insert account profile - save ID

      const orgMemberProfilePublicId = typeIdGenerator('orgMemberProfile');
      const orgMemberProfileResponse = await db
        .insert(orgMemberProfiles)
        .values({
          publicId: orgMemberProfilePublicId,
          orgId: orgId,
          firstName: newOrgMember.firstName,
          lastName: newOrgMember.lastName || '',
          title: newOrgMember.title || '',
          handle: ''
        });
      const orgMemberProfileId = +orgMemberProfileResponse.insertId;

      // Insert orgMember - save ID
      const orgMemberPublicId = typeIdGenerator('orgMembers');
      const orgMemberResponse = await db.insert(orgMembers).values({
        publicId: orgMemberPublicId,
        orgId: orgId,
        invitedByOrgMemberId: orgMemberId,
        status: 'invited',
        role: newOrgMember.role,
        orgMemberProfileId: orgMemberProfileId
      });

      // Insert groupMemberships - save ID
      if (groupsInput) {
        for (const groupPublicId of groupsInput.groupsPublicIds) {
          await addOrgMemberToGroupHandler({
            orgId: org.id,
            groupPublicId: groupPublicId,
            orgMemberPublicId: orgMemberPublicId,
            orgMemberId: org.memberId
          });
        }
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

        const emailRoutingRulesPublicId = typeIdGenerator('emailRoutingRules');
        const emailRoutingRulesResponse = await db
          .insert(emailRoutingRules)
          .values({
            orgId: orgId,
            publicId: emailRoutingRulesPublicId,
            name: `Email routing rule for ${email.emailUsername}@${domainResponse?.domain}`,
            createdBy: orgMemberId
          });
        const newRoutingRuleDestinationPublicId = typeIdGenerator(
          'emailRoutingRuleDestinations'
        );
        await db.insert(emailRoutingRulesDestinations).values({
          publicId: newRoutingRuleDestinationPublicId,
          orgId: orgId,
          ruleId: +emailRoutingRulesResponse.insertId,
          orgMemberId: +orgMemberResponse.insertId
        });

        const emailIdentityPublicId = typeIdGenerator('emailIdentities');
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

        await db.insert(emailIdentitiesAuthorizedOrgMembers).values({
          orgId: orgId,
          identityId: +emailIdentityResponse.insertId,
          default: true,
          addedBy: orgMemberId,
          orgMemberId: +orgMemberResponse.insertId
        });
      }

      // Insert orgInvitations - save ID

      const newInvitePublicId = typeIdGenerator('orgInvitations');
      const newInviteToken = nanoIdToken();

      await db.insert(orgInvitations).values({
        publicId: newInvitePublicId,
        orgId: orgId,
        invitedByOrgMemberId: orgMemberId,
        orgMemberId: +orgMemberResponse.insertId,
        role: newOrgMember.role,
        email: notification?.notificationEmailAddress || null,
        inviteToken: newInviteToken,
        invitedOrgMemberProfileId: orgMemberProfileId,
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
    .query(async ({ ctx }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db, org } = ctx;

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
                  avatarTimestamp: true,
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
                  avatarTimestamp: true,
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

  validateInvite: publicRateLimitedProcedure.validateInvite
    .input(
      z.object({
        inviteToken: zodSchemas.nanoIdToken()
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const userLoggedIn = ctx.account?.id ? true : false;

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
              avatarTimestamp: true,
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
        orgAvatarTimestamp: queryInvitesResponse.org.avatarTimestamp,
        orgName: queryInvitesResponse.org.name,
        orgSlug: queryInvitesResponse.org.slug,
        loggedIn: userLoggedIn
      };
    }),
  redeemInvite: accountProcedure
    .input(
      z.object({
        inviteToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account) {
        throw new Error('Account is not defined');
      }
      const { db, account } = ctx;
      const accountId = account?.id;

      const queryInvitesResponse = await db.query.orgInvitations.findFirst({
        where: eq(orgInvitations.inviteToken, input.inviteToken),
        columns: {
          id: true,
          orgId: true,
          role: true,
          invitedByOrgMemberId: true,
          expiresAt: true,
          acceptedAt: true,
          invitedOrgMemberProfileId: true,
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

      const invitedOrgMemberProfilePublicId =
        queryInvitesResponse?.invitedProfile?.publicId;
      if (
        !invitedOrgMemberProfilePublicId ||
        !queryInvitesResponse.invitedOrgMemberProfileId ||
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

      const userHandleQuery = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          username: true
        }
      });

      await db
        .update(orgMemberProfiles)
        .set({
          accountId: accountId,
          handle: userHandleQuery?.username || ''
        })
        .where(
          eq(
            orgMemberProfiles.id,
            +queryInvitesResponse.invitedOrgMemberProfileId
          )
        );

      await db
        .update(orgMembers)
        .set({
          accountId: accountId,
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
        invitePublicId: typeIdValidator('orgInvitations')
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

      const isAdmin = await isAccountAdminOfOrg(org);
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
        invitePublicId: typeIdValidator('orgInvitations')
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const { db, org } = ctx;

      const isAdmin = await isAccountAdminOfOrg(org);
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
