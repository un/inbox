import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { validateOrgShortCode } from '~platform/utils/orgShortCode';
import type { TrpcContext } from '~platform/ctx';
import { z } from 'zod';
import { env } from '~platform/env';

export const trpcContext = initTRPC
  .context<TrpcContext>()
  .create({ transformer: superjson });

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

export const publicProcedure = trpcContext.procedure.use(
  async ({ ctx, type, path, next }) =>
    ctx.event
      .get('otel')
      .tracer.startActiveSpan(`TRPC ${type} ${path}`, async (span) => {
        const result = await next();
        span.setAttributes({
          'trpc.ok': result.ok
        });
        span.end();
        return result;
      })
);

export const accountProcedure = publicProcedure.use(isAccountAuthenticated);
export const orgProcedure = publicProcedure
  .use(isAccountAuthenticated)
  .input(z.object({ orgShortCode: z.string() }))
  .use(({ input, ctx, next }) =>
    ctx.event
      .get('otel')
      .tracer.startActiveSpan(`Validate orgShortCode`, async (span) => {
        const { orgShortCode } = input;
        span.setAttribute('org.shortCode', orgShortCode);
        const orgData = await validateOrgShortCode(orgShortCode);

        if (!orgData) {
          span.setAttributes({ 'org.found': false });
          span.end();
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
          span.setAttributes({ 'org.is_member': false });
          span.end();
          ctx.event.header('Location', '/');
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You are not a member of this organization, redirecting...'
          });
        }
        span.setAttributes({
          'org.found': true,
          'org.is_member': true,
          'org.member_id': orgMembership.id
        });
        span.end();
        return next({
          ctx: {
            ...ctx,
            org: { ...orgData, memberId: orgMembership.id }
          }
        });
      })
  );

export const turnstileProcedure = publicProcedure
  .input(z.object({ turnstileToken: z.string().optional() }))
  .use(async ({ input, ctx, next }) => {
    if (!env.TURNSTILE_SECRET_KEY) return next();
    const { turnstileToken } = input;
    if (!turnstileToken)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Missing turnstile token'
      });
    const res = await fetch(
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
    ).then((res) => res.json());
    if (!res.success)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Failed to verify turnstileToken'
      });
    return next();
  });

export const eeProcedure = orgProcedure.use(isEeEnabled);

export const router = trpcContext.router;
export const middleware = trpcContext.middleware;
