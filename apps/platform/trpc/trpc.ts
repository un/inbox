import { validateOrgShortcode } from '~platform/utils/orgShortcode';
import { isAccountAdminOfOrg } from '~platform/utils/account';
import { TRPCError, initTRPC } from '@trpc/server';
import type { TrpcContext } from '~platform/ctx';
import { getTracer } from '@u22n/otel/helpers';
import { flatten } from '@u22n/otel/exports';
import { env } from '~platform/env';
import superjson from 'superjson';
import { z } from 'zod';

export const trpcContext = initTRPC
  .context<TrpcContext>()
  .create({ transformer: superjson });

export const createCallerFactory = trpcContext.createCallerFactory;

const isAccountAuthenticated = trpcContext.middleware(({ next, ctx }) => {
  if (!ctx.account) {
    ctx.event.header('Location', '/');
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not logged in, redirecting...'
    });
  }
  return next({
    ctx: { ...ctx, account: ctx.account }
  });
});

const isEeEnabled = trpcContext.middleware(({ next }) => {
  if (!env.EE_LICENSE_KEY) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Enterprise Edition features are disabled on this server'
    });
  }
  return next();
});

const trpcTracer = getTracer('platform/trpc');

export const publicProcedure = trpcContext.procedure.use(
  async ({ type, path, next }) =>
    trpcTracer.startActiveSpan(`TRPC ${type} ${path}`, async (span) => {
      const result = await next();
      if (span) {
        span.setAttributes(
          flatten({
            trpc: {
              type: type,
              path: path,
              ok: result.ok
            }
          })
        );
      }
      return result;
    })
);

export const accountProcedure = publicProcedure.use(isAccountAuthenticated);

export const orgProcedure = accountProcedure
  .input(z.object({ orgShortcode: z.string() }))
  .use(({ input, ctx, next }) =>
    trpcTracer.startActiveSpan(`TRPC orgProcedure`, async (span) => {
      const { orgShortcode } = input;
      span?.addEvent('trpc.orgMiddleware.start');
      const orgData = await validateOrgShortcode(orgShortcode);

      if (!orgData) {
        span?.setAttributes({ 'trpc.orgMiddleware.meta.org_found': false });
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found'
        });
      }

      const accountId = ctx.account.id;
      const orgMembership = orgData.members.find(
        (member) => member.accountId === accountId
      );

      if (!accountId || !orgMembership) {
        span?.setAttributes({ 'trpc.orgMiddleware.meta.is_member': false });
        ctx.event.header('Location', '/');
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not a member of this organization, redirecting...'
        });
      }

      span?.setAttributes(
        flatten({
          'trpc.orgMiddleware.meta': {
            org_found: true,
            is_member: true,
            member_id: orgMembership.id
          }
        })
      );

      span?.addEvent('trpc.orgMiddleware.end');
      return next({
        ctx: {
          ...ctx,
          org: { ...orgData, memberId: orgMembership.id }
        }
      });
    })
  );

export const orgAdminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  const isAdmin = await isAccountAdminOfOrg(ctx.org);
  if (!isAdmin) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You need to be an administrator'
    });
  }
  return next();
});

export const turnstileProcedure = publicProcedure
  .input(z.object({ turnstileToken: z.string().optional() }))
  .use(async ({ input, ctx, next }) => {
    if (!env.TURNSTILE_SECRET_KEY) return next();
    return trpcTracer.startActiveSpan(
      'TRPC turnstileProcedure',
      async (span) => {
        const { turnstileToken } = input;
        span?.addEvent('trpc.turnstileMiddleware.start');
        if (!turnstileToken) {
          span?.setAttributes({
            'trpc.turnstileMiddleware.meta.token_found': false
          });
          span?.addEvent('trpc.turnstileMiddleware.end');
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Missing turnstile token'
          });
        }

        const res = (await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              response: turnstileToken,
              secret: env.TURNSTILE_SECRET_KEY,
              remoteip: ctx.event.env.incoming.socket.remoteAddress
            })
          }
        ).then((res) => res.json())) as { success: boolean };

        span?.addEvent('trpc.turnstileMiddleware.end');
        span?.setAttributes(
          flatten({
            'trpc.turnstileMiddleware.meta': {
              token_found: true,
              success: res.success
            }
          })
        );

        if (!res.success)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to verify turnstileToken'
          });
        return next();
      }
    );
  });

export const eeProcedure = orgProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
