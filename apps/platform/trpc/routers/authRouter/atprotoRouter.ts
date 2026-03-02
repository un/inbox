import {
  blockedUsernames,
  containsBannedWords,
  reservedUsernames
} from '~platform/utils/signup';
import { getAuthorizationUrl, handleOAuthCallback } from '~platform/utils/auth/atproto-oauth';
import { createCustodialAccount } from '~platform/utils/auth/atproto-custodial';
import { atprotoIdentities, accounts } from '@u22n/database/schema';
import { createSessionCookie } from '~platform/utils/auth/session-manager';
import { router, turnstileProcedure, publicProcedure } from '~platform/trpc/trpc';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { ratelimiter } from '~platform/trpc/ratelimit';
import { zodSchemas } from '@u22n/utils/zodSchemas';
import { TRPCError } from '@trpc/server';
import { eq } from '@u22n/database/orm';
import { env } from '~platform/env';
import { z } from 'zod';

async function validateHandle(
  db: Parameters<Parameters<typeof publicProcedure.mutation>[0]>[0]['ctx']['db'],
  handle: string
): Promise<{ available: boolean; error: string | null }> {
  // Check format
  if (!/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/.test(handle)) {
    return { available: false, error: 'Handle must be 2–20 lowercase letters, numbers, or hyphens' };
  }

  if (containsBannedWords(handle.toLowerCase())) {
    return { available: false, error: 'Handle unavailable' };
  }
  if (blockedUsernames.includes(handle.toLowerCase())) {
    return { available: false, error: 'Handle unavailable' };
  }
  if (reservedUsernames.includes(handle.toLowerCase())) {
    return {
      available: false,
      error: 'This handle is reserved. If you own this trademark, please contact support'
    };
  }

  // Check local DB
  const existing = await db.query.atprotoIdentities.findFirst({
    where: eq(atprotoIdentities.handle, `${handle}.${env.ATPROTO_HANDLE_DOMAIN}`)
  });
  if (existing) {
    return { available: false, error: 'Handle unavailable' };
  }

  return { available: true, error: null };
}

export const atprotoRouter = router({
  // ─── OAuth (existing atproto users) ────────────────────────────────────────

  initiateOAuth: publicProcedure
    .use(ratelimiter({ limit: 20, namespace: 'auth.atproto.initiateOAuth' }))
    .input(z.object({ handle: z.string().min(3) }))
    .mutation(async ({ input }) => {
      const authUrl = await getAuthorizationUrl(input.handle).catch((err) => {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Failed to generate authorization URL'
        });
      });
      return { authUrl };
    }),

  oauthCallback: publicProcedure
    .use(ratelimiter({ limit: 20, namespace: 'auth.atproto.oauthCallback' }))
    .input(
      z.object({
        code: z.string(),
        state: z.string(),
        iss: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, event } = ctx;

      const searchParams = new URLSearchParams({
        code: input.code,
        state: input.state,
        iss: input.iss
      });

      const { did } = await handleOAuthCallback(searchParams).catch((err) => {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: err instanceof Error ? err.message : 'OAuth callback failed'
        });
      });

      // Look up existing linked account
      const existingIdentity = await db.query.atprotoIdentities.findFirst({
        where: eq(atprotoIdentities.did, did),
        with: {
          account: {
            columns: { id: true, username: true, publicId: true }
          }
        }
      });

      if (existingIdentity) {
        // Existing user — create session
        await createSessionCookie(event, {
          accountId: existingIdentity.account.id,
          username: existingIdentity.account.username,
          publicId: existingIdentity.account.publicId
        });

        const accountData = await db.query.accounts.findFirst({
          where: eq(accounts.id, existingIdentity.account.id),
          columns: {},
          with: {
            orgMemberships: {
              columns: {},
              with: { org: { columns: { shortcode: true } } }
            }
          }
        });

        return {
          success: true,
          defaultOrgShortcode:
            accountData?.orgMemberships[0]?.org.shortcode ?? null
        };
      }

      // New user — create account + identity
      const username = did.split(':').pop()?.slice(0, 32) ?? 'user';
      const publicId = typeIdGenerator('account');

      const { accountId, defaultOrgShortcode } = await db.transaction(
        async (tx) => {
          const newAccount = await tx
            .insert(accounts)
            .values({ username, publicId });
          const newAccountId = Number(newAccount.insertId);

          await tx.insert(atprotoIdentities).values({
            accountId: newAccountId,
            did,
            handle: did, // will be updated with resolved handle if available
            pdsUrl: input.iss,
            isCustodial: false
          });

          return { accountId: newAccountId, defaultOrgShortcode: null };
        }
      );

      await createSessionCookie(event, {
        accountId,
        username,
        publicId
      });

      return { success: true, defaultOrgShortcode };
    }),

  // ─── Custodial signup (new users, email-based) ────────────────────────────

  checkHandleAvailability: publicProcedure
    .use(ratelimiter({ limit: 30, namespace: 'auth.atproto.checkHandle' }))
    .input(z.object({ handle: zodSchemas.username() }))
    .query(({ ctx, input }) => validateHandle(ctx.db, input.handle)),

  custodialSignup: publicProcedure
    .unstable_concat(turnstileProcedure)
    .use(ratelimiter({ limit: 5, namespace: 'auth.atproto.custodialSignup' }))
    .input(
      z.object({
        email: z.string().email(),
        handle: zodSchemas.username()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, event } = ctx;
      const { email, handle } = input;

      const { available, error } = await validateHandle(db, handle);
      if (!available) {
        throw new TRPCError({ code: 'FORBIDDEN', message: error ?? 'Handle unavailable' });
      }

      // Create account on PDS
      const { did, handle: fullHandle, encryptedPassword } =
        await createCustodialAccount({ email, handle }).catch((err) => {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              err instanceof Error
                ? err.message
                : 'Failed to create PDS account'
          });
        });

      const publicId = typeIdGenerator('account');

      const accountId = await db.transaction(async (tx) => {
        const newAccount = await tx
          .insert(accounts)
          .values({ username: handle, publicId });
        const newAccountId = Number(newAccount.insertId);

        await tx.insert(atprotoIdentities).values({
          accountId: newAccountId,
          did,
          handle: fullHandle,
          pdsUrl: env.PDS_URL,
          isCustodial: true,
          encryptedAppPassword: encryptedPassword
        });

        return newAccountId;
      });

      await createSessionCookie(event, { accountId, username: handle, publicId });

      return { success: true };
    }),

  // ─── Identity info ────────────────────────────────────────────────────────

  getIdentity: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.account) return null;

    const identity = await ctx.db.query.atprotoIdentities.findFirst({
      where: eq(atprotoIdentities.accountId, ctx.account.id),
      columns: { did: true, handle: true, pdsUrl: true, isCustodial: true }
    });

    return identity ?? null;
  }),

  // ─── Validate handle (public, no auth) ────────────────────────────────────

  validateHandle: publicProcedure
    .use(ratelimiter({ limit: 30, namespace: 'auth.atproto.validateHandle' }))
    .input(z.object({ handle: z.string() }))
    .query(({ ctx, input }) => validateHandle(ctx.db, input.handle))
});
