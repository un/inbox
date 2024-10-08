import {
  domains,
  emailIdentities,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentitiesAuthorizedSenders,
  orgInvitations,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers
} from '@u22n/database/schema';
import {
  router,
  orgProcedure,
  accountProcedure,
  publicProcedure,
  orgAdminProcedure
} from '~platform/trpc/trpc';
import { refreshOrgShortcodeCache } from '~platform/utils/orgShortcode';
import { billingTrpcClient } from '~platform/utils/tRPCServerClients';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { sendInviteEmail } from '~platform/utils/mail/transactional';
import { validateSpaceShortCode } from '../../spaceRouter/utils';
import { nanoIdToken, zodSchemas } from '@u22n/utils/zodSchemas';
import { addOrgMemberToTeamHandler } from './teamsHandler';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { env } from '~platform/env';
import { z } from 'zod';

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
        teams: z
          .object({
            teamsPublicIds: z.array(typeIdValidator('teams'))
          })
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;

      const orgId = org.id;
      const orgMemberId = org?.memberId || 0;

      const { newOrgMember, notification, email, teams: teamsInput } = input;

      // Insert account profile - save ID
      return db.transaction(async (db) => {
        //check existing email invite
        const sentInviteEmails = await db.query.orgInvitations.findFirst({
          where: eq(
            orgInvitations.email,
            notification?.notificationEmailAddress ?? ''
          ),
          columns: {
            id: true
          }
        });

        if (sentInviteEmails) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email already invited'
          });
        }

        const orgMemberProfilePublicId = typeIdGenerator('orgMemberProfile');
        const orgMemberProfileResponse = await db
          .insert(orgMemberProfiles)
          .values({
            publicId: orgMemberProfilePublicId,
            orgId: orgId,
            firstName: newOrgMember.firstName,
            lastName: newOrgMember.lastName ?? '',
            title: newOrgMember.title ?? '',
            handle: ''
          });
        const orgMemberProfileId = +orgMemberProfileResponse.insertId;

        // Insert orgMember - save ID
        const newOrgMemberPublicId = typeIdGenerator('orgMembers');
        const newOrgMemberResponse = await db.insert(orgMembers).values({
          publicId: newOrgMemberPublicId,
          orgId: orgId,
          invitedByOrgMemberId: orgMemberId,
          status: 'invited',
          role: newOrgMember.role,
          orgMemberProfileId: orgMemberProfileId
        });

        const spaceShortcode = await validateSpaceShortCode({
          db: db,
          shortcode: `${newOrgMember.firstName}${newOrgMember.lastName ? '-' + newOrgMember.lastName : ''}`,
          orgId: orgId
        });

        const newSpaceResponse = await db.insert(spaces).values({
          orgId: orgId,
          publicId: typeIdGenerator('spaces'),
          name: 'Personal',
          type: 'private',
          personalSpace: true,
          color: 'cyan',
          icon: 'house',
          createdByOrgMemberId: Number(newOrgMemberResponse.insertId),
          shortcode: spaceShortcode.shortcode
        });

        await db.insert(spaceMembers).values({
          orgId: orgId,
          spaceId: Number(newSpaceResponse.insertId),
          publicId: typeIdGenerator('spaceMembers'),
          orgMemberId: Number(newOrgMemberResponse.insertId),
          addedByOrgMemberId: Number(newOrgMemberResponse.insertId),
          role: 'admin',
          canCreate: true,
          canRead: true,
          canComment: true,
          canReply: true,
          canDelete: true,
          canChangeWorkflow: true,
          canSetWorkflowToClosed: true,
          canAddTags: true,
          canMoveToAnotherSpace: true,
          canAddToAnotherSpace: true,
          canMergeConvos: true,
          canAddParticipants: true
        });

        await db
          .update(orgMembers)
          .set({
            personalSpaceId: Number(newSpaceResponse.insertId)
          })
          .where(eq(orgMembers.id, Number(newOrgMemberResponse.insertId)));

        // Insert teamMemberships - save ID
        if (teamsInput) {
          for (const teamPublicId of teamsInput.teamsPublicIds) {
            await addOrgMemberToTeamHandler(db, {
              orgId: org.id,
              teamPublicId: teamPublicId,
              orgMemberPublicId: newOrgMemberPublicId,
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
            db.rollback();
            throw new TRPCError({
              code: 'UNPROCESSABLE_CONTENT',
              message: 'Domain not found'
            });
          }

          const emailRoutingRulesPublicId =
            typeIdGenerator('emailRoutingRules');
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
            spaceId: Number(newSpaceResponse.insertId)
          });

          const emailIdentityPublicId = typeIdGenerator('emailIdentities');
          const mailDomains = env.MAIL_DOMAINS;
          const fwdDomain = mailDomains.fwd[0];
          const newForwardingAddress = `${nanoIdToken()}@${fwdDomain}`;
          const emailIdentityResponse = await db
            .insert(emailIdentities)
            .values({
              publicId: emailIdentityPublicId,
              orgId: orgId,
              createdBy: orgMemberId,
              domainId: domainResponse?.id,
              username: email.emailUsername,
              domainName: domainResponse?.domain,
              routingRuleId: Number(emailRoutingRulesResponse.insertId),
              forwardingAddress: newForwardingAddress,
              isCatchAll: false,
              sendName: email.sendName
            });

          await db.insert(emailIdentitiesAuthorizedSenders).values({
            orgId: orgId,
            identityId: Number(emailIdentityResponse.insertId),
            addedBy: orgMemberId,
            spaceId: Number(newSpaceResponse.insertId)
          });

          await db
            .update(orgMembers)
            .set({
              personalSpaceId: Number(newSpaceResponse.insertId)
            })
            .where(eq(orgMembers.id, Number(newOrgMemberResponse.insertId)));
        }

        // Insert orgInvitations - save ID

        const newInvitePublicId = typeIdGenerator('orgInvitations');
        const newInviteToken = nanoIdToken();

        await db.insert(orgInvitations).values({
          publicId: newInvitePublicId,
          orgId: orgId,
          invitedByOrgMemberId: orgMemberId,
          orgMemberId: +newOrgMemberResponse.insertId,
          role: newOrgMember.role,
          email: notification?.notificationEmailAddress ?? null,
          inviteToken: newInviteToken,
          invitedOrgMemberProfileId: orgMemberProfileId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Days from now
        });

        if (notification?.notificationEmailAddress) {
          const res = await sendInviteEmail({
            to: notification?.notificationEmailAddress || '',
            invitedName: `${newOrgMember.firstName} ${newOrgMember.lastName ?? ''}`,
            invitingOrgName: org.name,
            expiryDate: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toDateString(),
            inviteUrl: `${env.WEBAPP_URL}/join/invite/${newInviteToken}`
          });

          if (!res) {
            db.rollback();
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to send invite email'
            });
          }
        }

        return {
          success: true,
          inviteId: newInvitePublicId,
          inviteToken: newInviteToken,
          error: null
        };
      });
    }),
  viewInvites: orgProcedure.query(async ({ ctx }) => {
    const { db, org } = ctx;

    const orgId = org.id;

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

  deleteInvite: orgAdminProcedure
    .input(
      z.object({
        invitePublicId: typeIdValidator('orgInvitations'),
        orgMemberPublicId: typeIdValidator('orgMembers'),
        emailIdentitiesPublicId: typeIdValidator('emailIdentities').optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { orgMemberPublicId } = input;

      const orgMember = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.publicId, orgMemberPublicId),
        columns: {
          id: true,
          orgMemberProfileId: true,
          personalSpaceId: true
        }
      });

      if (!orgMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Org Member not found'
        });
      }

      const orgInvitesResponse = await db.query.orgInvitations.findFirst({
        where: eq(orgInvitations.orgMemberId, orgMember.id),
        columns: {
          id: true,
          acceptedAt: true
        }
      });

      if (!orgInvitesResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found'
        });
      }

      if (orgInvitesResponse.acceptedAt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Used invitation cannot be deleted'
        });
      }

      const {
        id: orgMemberId,
        orgMemberProfileId,
        personalSpaceId
      } = orgMember;

      await db.transaction(async (db) => {
        if (input.emailIdentitiesPublicId) {
          await db
            .delete(emailIdentities)
            .where(eq(emailIdentities.publicId, input.emailIdentitiesPublicId));
        }

        if (personalSpaceId) {
          await db
            .delete(spaceMembers)
            .where(eq(spaceMembers.spaceId, personalSpaceId));
          await db.delete(spaces).where(eq(spaces.id, personalSpaceId));
        }

        await db
          .delete(orgMemberProfiles)
          .where(eq(orgMemberProfiles.id, orgMemberProfileId));

        await db.delete(orgMembers).where(eq(orgMembers.id, orgMemberId));

        if (orgInvitesResponse) {
          await db
            .delete(orgInvitations)
            .where(eq(orgInvitations.id, orgInvitesResponse.id));
        }
      });
    }),

  validateInvite: publicProcedure
    .use(ratelimiter({ limit: 10, namespace: 'invite.validate' }))
    .input(
      z.object({
        inviteToken: zodSchemas.nanoIdToken()
      })
    )
    .query(async ({ ctx, input }) => {
      const db = ctx.db;
      const userLoggedIn = ctx.account?.id ? true : false;
      let username;
      if (ctx.account?.id) {
        const queryUserResponse = await db.query.accounts.findFirst({
          where: eq(accounts.id, ctx.account.id),
          columns: {
            username: true
          }
        });
        username = queryUserResponse?.username;
      }

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
              shortcode: true
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
        orgShortcode: queryInvitesResponse.org.shortcode,
        loggedIn: userLoggedIn,
        username: username
      };
    }),
  redeemInvite: accountProcedure
    .input(
      z.object({
        inviteToken: zodSchemas.nanoIdToken()
      })
    )
    .mutation(async ({ ctx, input }) => {
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
              shortcode: true
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

      const invitedOrgMemberProfilePublicId =
        queryInvitesResponse.invitedProfile?.publicId;
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

      const userQuery = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          username: true
        },
        with: {
          orgMemberships: {
            columns: {
              orgId: true
            }
          }
        }
      });

      if (
        userQuery?.orgMemberships.find(
          (org) => org.orgId === queryInvitesResponse.orgId
        )
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are already a member of this org'
        });
      }

      await db
        .update(orgMemberProfiles)
        .set({
          accountId: accountId,
          handle: userQuery?.username ?? ''
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

      await refreshOrgShortcodeCache(+queryInvitesResponse.orgId);

      if (env.EE_LICENSE_KEY) {
        await billingTrpcClient.stripe.subscriptions.updateOrgUserCount.mutate({
          orgId: +queryInvitesResponse.orgId
        });
      }

      return {
        success: true,
        orgShortcode: queryInvitesResponse.org.shortcode
      };
    }),
  invalidateInvite: orgAdminProcedure
    .input(
      z.object({
        invitePublicId: typeIdValidator('orgInvitations')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

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
  refreshInvite: orgAdminProcedure
    .input(
      z.object({
        invitePublicId: typeIdValidator('orgInvitations')
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;

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
