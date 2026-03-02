import {
  accounts,
  atprotoIdentities,
  contacts,
  convoAttachments,
  convoEntries,
  convoEntryPrivateVisibilityParticipants,
  convoEntryRawHtmlEmails,
  convoEntryReplies,
  convoEntrySeenTimestamps,
  convoParticipants,
  convoParticipantTeamMembers,
  convos,
  convoSeenTimestamps,
  convoSubjects,
  domains,
  emailIdentities,
  emailIdentitiesAuthorizedSenders,
  emailIdentitiesPersonal,
  emailIdentityExternal,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  orgInvitations,
  orgMemberProfiles,
  orgModules,
  orgMembers,
  orgPostalConfigs,
  orgs,
  pendingAttachments,
  postalServers,
  sessions,
  teamMembers,
  teams,
  spaces,
  spaceMembers,
  spaceWorkflows,
  spaceTags
} from '@u22n/database/schema';
import {
  billingTrpcClient,
  mailBridgeTrpcClient
} from '~platform/utils/tRPCServerClients';
import { accountIdentifier, ratelimiter } from '~platform/trpc/ratelimit';
import { refreshOrgShortcodeCache } from '~platform/utils/orgShortcode';
import { deleteCookie, getCookie, setCookie } from '@u22n/hono/helpers';
import { sessionManager } from '~platform/utils/auth/session-manager';
import { router, accountProcedure } from '~platform/trpc/trpc';
import { COOKIE_ELEVATED_TOKEN } from '~platform/utils/cookieNames';
import { inArray } from '@u22n/database/orm';
import { nanoIdToken } from '@u22n/utils/zodSchemas';
import { typeIdValidator } from '@u22n/utils/typeid';
import type { TrpcContext } from '~platform/ctx';
import { and, eq } from '@u22n/database/orm';
import { storage } from '~platform/storage';
import { datePlus } from '@u22n/utils/ms';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { z } from 'zod';

async function checkIfElevated(ctx: TrpcContext) {
  const elevatedCookie = getCookie(ctx.event, COOKIE_ELEVATED_TOKEN);
  if (!elevatedCookie) return false;
  const elevatedToken = await storage.elevatedTokens.getItem(elevatedCookie);
  if (!elevatedToken) return false;
  if (
    elevatedToken.issuer.accountId !== ctx.account?.id ||
    elevatedToken.issuer.sessionId !== ctx.account?.session.id ||
    elevatedToken.issuer.deviceIp !==
      (ctx.event.env.incoming.socket.remoteAddress ?? '<unknown>')
  )
    return false;
  return true;
}

async function revokeElevation(ctx: TrpcContext) {
  const elevatedCookie = getCookie(ctx.event, COOKIE_ELEVATED_TOKEN);
  if (!elevatedCookie) return;
  await storage.elevatedTokens.removeItem(elevatedCookie);
  deleteCookie(ctx.event, COOKIE_ELEVATED_TOKEN);
}

const elevatedProcedure = accountProcedure.use(async ({ ctx, next }) => {
  if (!(await checkIfElevated(ctx)))
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message:
        'You are not allowed to perform elevated action at this moment. Please try again'
    });
  return next();
});

export const securityRouter = router({
  // Elevated Mode — now a simple confirmation (no passkey/password re-auth needed)
  checkIfElevated: accountProcedure.query(async ({ ctx }) => ({
    isElevated: await checkIfElevated(ctx)
  })),

  grantElevation: accountProcedure.mutation(async ({ ctx }) => {
    const { account } = ctx;

    const elevationToken = nanoIdToken();
    await storage.elevatedTokens.setItem(elevationToken, {
      issuer: {
        accountId: account.id,
        sessionId: account.session.id,
        deviceIp: ctx.event.env.incoming.socket.remoteAddress ?? '<unknown>'
      }
    });

    setCookie(ctx.event, COOKIE_ELEVATED_TOKEN, elevationToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      expires: datePlus('5 minutes'),
      domain: env.PRIMARY_DOMAIN
    });

    return { success: true };
  }),

  // AT Protocol Identity
  getAtprotoIdentity: accountProcedure.query(async ({ ctx }) => {
    const { db, account } = ctx;
    const identity = await db.query.atprotoIdentities.findFirst({
      where: eq(atprotoIdentities.accountId, account.id),
      columns: {
        did: true,
        handle: true,
        pdsUrl: true,
        isCustodial: true
      }
    });
    return identity ?? null;
  }),

  // Sessions
  getOverview: accountProcedure.query(async ({ ctx }) => {
    const { db, account } = ctx;

    const accountQuery = await db.query.accounts.findFirst({
      where: eq(accounts.id, account.id),
      columns: { publicId: true },
      with: {
        sessions: {
          columns: {
            sessionToken: true,
            publicId: true,
            os: true,
            device: true,
            createdAt: true
          }
        },
        atprotoIdentity: {
          columns: {
            did: true,
            handle: true,
            pdsUrl: true,
            isCustodial: true
          }
        }
      }
    });

    if (!accountQuery) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Account not found' });
    }

    return {
      atprotoIdentity: accountQuery.atprotoIdentity ?? null,
      sessions:
        accountQuery.sessions.map(({ sessionToken: _, ...rest }) => rest) || [],
      thisDevice: accountQuery.sessions.find(
        (s) => s.sessionToken === account.session.id
      )?.publicId
    };
  }),

  removeSession: elevatedProcedure
    .input(z.object({ sessionPublicId: typeIdValidator('accountSession') }))
    .mutation(async ({ ctx, input }) => {
      const { db, account } = ctx;

      const accountData = await db.query.accounts.findFirst({
        where: eq(accounts.id, account.id),
        columns: { id: true, publicId: true }
      });

      if (!accountData) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const sessionQuery = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.publicId, input.sessionPublicId),
          eq(sessions.accountId, accountData.id)
        ),
        columns: { id: true, publicId: true, sessionToken: true }
      });

      if (!sessionQuery) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      if (sessionQuery.sessionToken === account.session.id)
        await revokeElevation(ctx);

      await sessionManager.invalidateSession(sessionQuery.sessionToken);

      return { success: true };
    }),

  removeAllSessions: elevatedProcedure.mutation(async ({ ctx }) => {
    const { account } = ctx;
    await sessionManager.invalidateUserSessions(account.id);
    await revokeElevation(ctx);
    return { success: true };
  }),

  // Account Deletion
  deleteAccountPre: elevatedProcedure.query(async ({ ctx }) => {
    const { db, account } = ctx;
    const accountOrgsQuery = await db.query.accounts.findFirst({
      where: eq(accounts.id, account.id),
      columns: { username: true },
      with: {
        orgMemberships: {
          columns: { id: true, role: true },
          with: {
            org: {
              columns: {
                publicId: true,
                name: true,
                avatarTimestamp: true,
                ownerId: true,
                shortcode: true
              }
            }
          }
        }
      }
    });

    if (!accountOrgsQuery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not in any orgs' });
    }

    const ownedOrgs = accountOrgsQuery.orgMemberships.filter(
      (m) => m.org.ownerId === account.id
    );
    const memberOrgs = accountOrgsQuery.orgMemberships.filter(
      (m) => m.org.ownerId !== account.id
    );

    return {
      username: accountOrgsQuery.username,
      ownedOrgs: ownedOrgs.map((m) => ({
        publicId: m.org.publicId,
        name: m.org.name,
        avatarTimestamp: m.org.avatarTimestamp,
        shortcode: m.org.shortcode
      })),
      memberOrgs: memberOrgs.map((m) => ({
        publicId: m.org.publicId,
        name: m.org.name,
        avatarTimestamp: m.org.avatarTimestamp,
        shortcode: m.org.shortcode
      }))
    };
  }),

  deleteAccountConfirm: elevatedProcedure.mutation(async ({ ctx }) => {
    const { db, account } = ctx;

    // Soft-delete account data
    await db
      .update(accounts)
      .set({ metadata: { deleted: new Date() } })
      .where(eq(accounts.id, account.id));

    // Delete sessions
    await sessionManager.invalidateUserSessions(account.id);

    // Remove org memberships
    const orgMembersQuery = await db.query.orgMembers.findMany({
      where: eq(orgMembers.accountId, account.id),
      columns: { id: true, publicId: true },
      with: { org: { columns: { id: true } } }
    });

    if (orgMembersQuery.length > 0) {
      const orgMemberIdsArray = orgMembersQuery.map((m) => m.id);
      const orgIdsArray = orgMembersQuery.map((m) => m.org.id);

      await Promise.allSettled(
        orgIdsArray.map(async (orgId) => {
          await refreshOrgShortcodeCache(orgId);
        })
      );

      await db
        .update(orgMembers)
        .set({ removedAt: new Date(), accountId: null, status: 'removed' })
        .where(inArray(orgMembers.id, orgMemberIdsArray));

      if (!ctx.selfHosted) {
        await Promise.allSettled(
          orgIdsArray.map(async (orgId) => {
            await billingTrpcClient.stripe.subscriptions.updateOrgUserCount.mutate(
              { orgId }
            );
          })
        );
      }
    }

    // Delete owned orgs
    const orgsQuery = await db.query.orgs.findMany({
      where: eq(orgs.ownerId, account.id),
      columns: { id: true, publicId: true, shortcode: true },
      with: { postalConfig: true }
    });

    if (orgsQuery.length > 0) {
      const orgIdsArray = orgsQuery.map((o) => o.id);

      await db
        .transaction(async (db) => {
          try {
            await db.delete(orgs).where(inArray(orgs.id, orgIdsArray));
            await db.delete(orgInvitations).where(inArray(orgInvitations.orgId, orgIdsArray));
            await db.delete(orgModules).where(inArray(orgModules.orgId, orgIdsArray));
            await db.delete(orgPostalConfigs).where(inArray(orgPostalConfigs.orgId, orgIdsArray));
            await db.delete(orgMembers).where(inArray(orgMembers.orgId, orgIdsArray));
            await db.delete(orgMemberProfiles).where(inArray(orgMemberProfiles.orgId, orgIdsArray));
            await db.delete(teams).where(inArray(teams.orgId, orgIdsArray));
            await db.delete(teamMembers).where(inArray(teamMembers.orgId, orgIdsArray));
            await db.delete(domains).where(inArray(domains.orgId, orgIdsArray));
            await db.delete(postalServers).where(inArray(postalServers.orgId, orgIdsArray));
            await db.delete(contacts).where(inArray(contacts.orgId, orgIdsArray));
            await db.delete(emailRoutingRules).where(inArray(emailRoutingRules.orgId, orgIdsArray));
            await db.delete(emailRoutingRulesDestinations).where(inArray(emailRoutingRulesDestinations.orgId, orgIdsArray));
            await db.delete(emailIdentities).where(inArray(emailIdentities.orgId, orgIdsArray));
            await db.delete(emailIdentitiesAuthorizedSenders).where(inArray(emailIdentitiesAuthorizedSenders.orgId, orgIdsArray));
            await db.delete(emailIdentitiesPersonal).where(inArray(emailIdentitiesPersonal.orgId, orgIdsArray));
            await db.delete(emailIdentityExternal).where(inArray(emailIdentityExternal.orgId, orgIdsArray));
            await db.delete(convos).where(inArray(convos.orgId, orgIdsArray));
            await db.delete(convoSubjects).where(inArray(convoSubjects.orgId, orgIdsArray));
            await db.delete(convoParticipants).where(inArray(convoParticipants.orgId, orgIdsArray));
            await db.delete(convoParticipantTeamMembers).where(inArray(convoParticipantTeamMembers.orgId, orgIdsArray));
            await db.delete(convoAttachments).where(inArray(convoAttachments.orgId, orgIdsArray));
            await db.delete(pendingAttachments).where(inArray(pendingAttachments.orgId, orgIdsArray));
            await db.delete(convoEntries).where(inArray(convoEntries.orgId, orgIdsArray));
            await db.delete(convoEntryReplies).where(inArray(convoEntryReplies.orgId, orgIdsArray));
            await db.delete(convoEntryPrivateVisibilityParticipants).where(inArray(convoEntryPrivateVisibilityParticipants.orgId, orgIdsArray));
            await db.delete(convoEntryRawHtmlEmails).where(inArray(convoEntryRawHtmlEmails.orgId, orgIdsArray));
            await db.delete(convoSeenTimestamps).where(inArray(convoSeenTimestamps.orgId, orgIdsArray));
            await db.delete(convoEntrySeenTimestamps).where(inArray(convoEntrySeenTimestamps.orgId, orgIdsArray));
            await db.delete(spaces).where(inArray(spaces.orgId, orgIdsArray));
            await db.delete(spaceMembers).where(inArray(spaceMembers.orgId, orgIdsArray));
            await db.delete(spaceWorkflows).where(inArray(spaceWorkflows.orgId, orgIdsArray));
            await db.delete(spaceTags).where(inArray(spaceTags.orgId, orgIdsArray));
          } catch (e) {
            console.error(e);
          }
        })
        .catch(() => {
          console.error(
            'Failed to delete some data, still continuing with deletion',
            orgsQuery.map((o) => o.id)
          );
        });

      const orgPublicIdsArray = orgsQuery.map((o) => o.publicId);

      await Promise.allSettled(
        orgsQuery
          .filter((o) => o.postalConfig)
          .map(({ publicId }) =>
            mailBridgeTrpcClient.postal.org.deletePostalOrg.mutate({
              orgPublicId: publicId
            })
          )
      );

      const orgShortcodesArray = orgsQuery.map((o) => o.shortcode);
      await Promise.allSettled(
        orgShortcodesArray.map(async (orgShortcode) => {
          await storage.orgContext.removeItem(orgShortcode);
        })
      );

      const deleteStorageResponse = (await fetch(
        `${env.STORAGE_URL}/api/orgs/delete`,
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: env.STORAGE_KEY
          },
          body: JSON.stringify({ orgPublicIds: orgPublicIdsArray })
        }
      ).then((res) => res.json())) as unknown;

      if (!deleteStorageResponse) {
        console.error('🔥 Failed to delete attachments from storage', {
          orgPublicIdsArray
        });
      }

      if (!ctx.selfHosted) {
        await Promise.all(
          orgIdsArray.map(async (orgId) => {
            await billingTrpcClient.stripe.subscriptions.cancelOrgSubscription.mutate(
              { orgId }
            );
          })
        );
      }
    }

    return true;
  })
});
