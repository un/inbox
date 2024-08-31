import {
  orgs,
  orgMembers,
  orgMemberProfiles,
  accounts,
  spaces,
  spaceMembers,
  orgInvitations,
  orgModules,
  orgPostalConfigs,
  teams,
  teamMembers,
  domains,
  postalServers,
  contacts,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  emailIdentitiesAuthorizedSenders,
  emailIdentitiesPersonal,
  emailIdentityExternal,
  convos,
  convoSubjects,
  convoParticipants,
  convoParticipantTeamMembers,
  convoAttachments,
  pendingAttachments,
  convoEntries,
  convoEntryReplies,
  convoEntryPrivateVisibilityParticipants,
  convoEntryRawHtmlEmails,
  convoSeenTimestamps,
  convoEntrySeenTimestamps,
  spaceWorkflows,
  spaceTags
} from '@u22n/database/schema';
import {
  billingTrpcClient,
  mailBridgeTrpcClient
} from '~platform/utils/tRPCServerClients';
import { blockedUsernames, reservedUsernames } from '~platform/utils/signup';
import { router, accountProcedure, orgProcedure } from '~platform/trpc/trpc';
import { validateSpaceShortCode } from '../spaceRouter/utils';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { eq, and, like } from '@u22n/database/orm';
import type { DBType } from '@u22n/database';
import { storage } from '~platform/storage';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { z } from 'zod';

async function validateOrgShortcode(
  db: DBType,
  shortcode: string
): Promise<{
  available: boolean;
  error: string | null;
}> {
  const orgId = await db
    .select({ id: orgs.id })
    .from(orgs)
    .where(eq(orgs.shortcode, shortcode));
  if (orgId.length !== 0) {
    return {
      available: false,
      error: 'Already taken'
    };
  }
  if (blockedUsernames.includes(shortcode.toLowerCase())) {
    return {
      available: false,
      error: 'Org shortcode not allowed'
    };
  }
  if (reservedUsernames.includes(shortcode.toLowerCase())) {
    return {
      available: false,
      error:
        'This organization name is currently reserved. If you own this trademark, please Contact Support'
    };
  }
  return {
    available: true,
    error: null
  };
}

export const crudRouter = router({
  checkShortcodeAvailability: accountProcedure
    .input(
      z.object({
        shortcode: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-z0-9]*$/, {
            message: 'Only lowercase letters and numbers'
          })
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateOrgShortcode(ctx.db, input.shortcode);
    }),

  generateOrgShortcode: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(5)
      })
    )
    .query(async ({ ctx, input }) => {
      const autoShortcode = input.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const existingOrgs = await ctx.db.query.orgs.findMany({
        where: like(orgs.shortcode, `${autoShortcode}%`),
        columns: {
          shortcode: true
        }
      });

      const existingShortcodeList = existingOrgs.map((org) => org.shortcode);
      if (
        existingShortcodeList.length === 0 ||
        !existingShortcodeList.includes(autoShortcode)
      ) {
        return { shortcode: autoShortcode.substring(0, 32) };
      }
      let currentSuffix = existingShortcodeList.length;
      let retries = 0;
      let newShortcode = `${autoShortcode.substring(0, 28)}${currentSuffix}`;

      while (existingShortcodeList.includes(newShortcode)) {
        currentSuffix++;
        newShortcode = `${autoShortcode.substring(0, 28)}${currentSuffix}`;
        retries++;
        if (retries > 30) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'Failed to generate unique shortcode, please type one manually'
          });
        }
      }
      return { shortcode: newShortcode };
    }),

  createNewOrg: accountProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgShortcode: z
          .string()
          .min(5)
          .max(64)
          .regex(/^[a-z0-9]*$/, {
            message: 'Only lowercase letters and numbers'
          })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const shortcodeAvailability = await validateOrgShortcode(
        db,
        input.orgShortcode
      );

      if (!shortcodeAvailability.available) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: shortcodeAvailability.error ?? 'Org shortcode not available'
        });
      }

      const newOrgPublicId = typeIdGenerator('org');

      const insertOrgResponse = await db.insert(orgs).values({
        ownerId: accountId,
        name: input.orgName,
        shortcode: input.orgShortcode,
        publicId: newOrgPublicId
      });
      const orgId = Number(insertOrgResponse.insertId);

      const { username } =
        (await db.query.accounts.findFirst({
          where: eq(accounts.id, accountId),
          columns: {
            username: true
          }
        })) ?? {};

      if (!username) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found. Please contact support.'
        });
      }

      const newOrgMemberProfileInsert = await db
        .insert(orgMemberProfiles)
        .values({
          orgId: orgId,
          publicId: typeIdGenerator('orgMemberProfile'),
          accountId: accountId,
          firstName: username,
          lastName: '',
          handle: username,
          title: '',
          blurb: ''
        });

      const newOrgMemberPublicId = typeIdGenerator('orgMembers');
      const orgMemberResponse = await db.insert(orgMembers).values({
        orgId: orgId,
        publicId: newOrgMemberPublicId,
        role: 'admin',
        accountId: accountId,
        status: 'active',
        orgMemberProfileId: Number(newOrgMemberProfileInsert.insertId)
      });

      const spaceShortcode = await validateSpaceShortCode({
        db: db,
        shortcode: `${username}`,
        orgId: orgId
      });
      const newSpaceResponse = await db.insert(spaces).values({
        orgId: orgId,
        publicId: typeIdGenerator('spaces'),
        name: `${username}'s Personal Space`,
        type: 'private',
        personalSpace: true,
        color: 'cyan',
        icon: 'house',
        createdByOrgMemberId: Number(orgMemberResponse.insertId),
        shortcode: spaceShortcode.shortcode
      });

      await db.insert(spaceMembers).values({
        orgId: orgId,
        spaceId: Number(newSpaceResponse.insertId),
        publicId: typeIdGenerator('spaceMembers'),
        orgMemberId: Number(orgMemberResponse.insertId),
        addedByOrgMemberId: Number(orgMemberResponse.insertId),
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
        .where(eq(orgMembers.id, Number(orgMemberResponse.insertId)));

      return {
        orgId: newOrgPublicId,
        orgName: input.orgName
      };
    }),

  getAccountOrgs: accountProcedure
    .input(
      z.object({
        onlyAdmin: z.boolean().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, account } = ctx;
      const accountId = account.id;

      const whereAccountIsAdmin = input.onlyAdmin ?? false;

      const orgMembersQuery = await db.query.orgMembers.findMany({
        columns: {
          role: true
        },
        where: whereAccountIsAdmin
          ? and(
              eq(orgMembers.accountId, accountId),
              eq(orgMembers.role, 'admin')
            )
          : eq(orgMembers.accountId, accountId),
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

      const adminOrgShortcodes = orgMembersQuery
        .filter((orgMember) => orgMember.role === 'admin')
        .map((orgMember) => orgMember.org.shortcode);

      return {
        userOrgs: orgMembersQuery,
        adminOrgShortcodes: adminOrgShortcodes
      };
    }),
  deleteOrg: orgProcedure.mutation(async ({ ctx }) => {
    const { db, account, org } = ctx;

    const orgQuery = await db.query.orgs.findFirst({
      where: eq(orgs.id, org.id),
      columns: {
        id: true,
        publicId: true,
        shortcode: true,
        ownerId: true
      },
      with: {
        postalConfig: true
      }
    });

    if (orgQuery?.ownerId !== account.id) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You are not authorized to delete this organization'
      });
    }

    await db
      .transaction(async (db) => {
        try {
          await db.delete(orgs).where(eq(orgs.id, orgQuery.id));
          await db
            .delete(orgInvitations)
            .where(eq(orgInvitations.orgId, orgQuery.id));
          await db.delete(orgModules).where(eq(orgModules.orgId, orgQuery.id));
          await db
            .delete(orgPostalConfigs)
            .where(eq(orgPostalConfigs.orgId, orgQuery.id));
          await db.delete(orgMembers).where(eq(orgMembers.orgId, orgQuery.id));
          await db
            .delete(orgMemberProfiles)
            .where(eq(orgMemberProfiles.orgId, orgQuery.id));
          await db.delete(teams).where(eq(teams.orgId, orgQuery.id));
          await db
            .delete(teamMembers)
            .where(eq(teamMembers.orgId, orgQuery.id));
          await db.delete(domains).where(eq(domains.orgId, orgQuery.id));
          await db
            .delete(postalServers)
            .where(eq(postalServers.orgId, orgQuery.id));
          await db.delete(contacts).where(eq(contacts.orgId, orgQuery.id));
          await db
            .delete(emailRoutingRules)
            .where(eq(emailRoutingRules.orgId, orgQuery.id));
          await db
            .delete(emailRoutingRulesDestinations)
            .where(eq(emailRoutingRulesDestinations.orgId, orgQuery.id));
          await db
            .delete(emailIdentities)
            .where(eq(emailIdentities.orgId, orgQuery.id));
          await db
            .delete(emailIdentitiesAuthorizedSenders)
            .where(eq(emailIdentitiesAuthorizedSenders.orgId, orgQuery.id));
          await db
            .delete(emailIdentitiesPersonal)
            .where(eq(emailIdentitiesPersonal.orgId, orgQuery.id));
          await db
            .delete(emailIdentityExternal)
            .where(eq(emailIdentityExternal.orgId, orgQuery.id));
          await db.delete(convos).where(eq(convos.orgId, orgQuery.id));
          await db
            .delete(convoSubjects)
            .where(eq(convoSubjects.orgId, orgQuery.id));
          await db
            .delete(convoParticipants)
            .where(eq(convoParticipants.orgId, orgQuery.id));
          await db
            .delete(convoParticipantTeamMembers)
            .where(eq(convoParticipantTeamMembers.orgId, orgQuery.id));
          await db
            .delete(convoAttachments)
            .where(eq(convoAttachments.orgId, orgQuery.id));
          await db
            .delete(pendingAttachments)
            .where(eq(pendingAttachments.orgId, orgQuery.id));
          await db
            .delete(convoEntries)
            .where(eq(convoEntries.orgId, orgQuery.id));
          await db
            .delete(convoEntryReplies)
            .where(eq(convoEntryReplies.orgId, orgQuery.id));
          await db
            .delete(convoEntryPrivateVisibilityParticipants)
            .where(
              eq(convoEntryPrivateVisibilityParticipants.orgId, orgQuery.id)
            );
          await db
            .delete(convoEntryRawHtmlEmails)
            .where(eq(convoEntryRawHtmlEmails.orgId, orgQuery.id));
          await db
            .delete(convoSeenTimestamps)
            .where(eq(convoSeenTimestamps.orgId, orgQuery.id));
          await db
            .delete(convoEntrySeenTimestamps)
            .where(eq(convoEntrySeenTimestamps.orgId, orgQuery.id));
          await db.delete(domains).where(eq(domains.orgId, orgQuery.id));
          await db.delete(spaces).where(eq(spaces.orgId, orgQuery.id));
          await db
            .delete(spaceMembers)
            .where(eq(spaceMembers.orgId, orgQuery.id));
          await db
            .delete(spaceWorkflows)
            .where(eq(spaceWorkflows.orgId, orgQuery.id));
          await db.delete(spaceTags).where(eq(spaceTags.orgId, orgQuery.id));
        } catch (e) {
          console.error('Failed to delete org', orgQuery.id);
          console.error(e);
          db.rollback();
        }
      })
      .catch(() => {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete org'
        });
      });

    // Delete org from Postal DB
    if (orgQuery.postalConfig) {
      await mailBridgeTrpcClient.postal.org.deletePostalOrg.mutate({
        orgPublicId: orgQuery.publicId
      });
    }

    // Delete orgShortcode Cache
    await storage.orgContext.removeItem(orgQuery.shortcode);

    // Delete attachments

    const deleteStorageResponse = (await fetch(
      `${env.STORAGE_URL}/api/orgs/delete`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: env.STORAGE_KEY
        },
        body: JSON.stringify({
          orgPublicIds: [orgQuery.publicId]
        })
      }
    ).then((res) => res.json())) as unknown;

    if (!deleteStorageResponse) {
      console.error(
        '🔥 Failed to delete attachments from storage',
        orgQuery.publicId
      );
    }

    // Delete Billing
    if (!ctx.selfHosted) {
      await billingTrpcClient.stripe.subscriptions.cancelOrgSubscription.mutate(
        {
          orgId: orgQuery.id
        }
      );
    }
  })
});
