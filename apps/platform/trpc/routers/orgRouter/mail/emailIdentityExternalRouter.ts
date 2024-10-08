import {
  orgMembers,
  teams,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  emailIdentitiesAuthorizedSenders,
  emailIdentityExternal,
  spaces
} from '@u22n/database/schema';
import { and, eq, inArray, type InferInsertModel } from '@u22n/database/orm';
import { mailBridgeTrpcClient } from '~platform/utils/tRPCServerClients';
import { typeIdGenerator, typeIdValidator } from '@u22n/utils/typeid';
import { router, orgProcedure } from '~platform/trpc/trpc';
import { nanoIdToken } from '@u22n/utils/zodSchemas';
import { TRPCError } from '@trpc/server';
import { env } from '~platform/env';
import { z } from 'zod';

export const emailIdentityExternalRouter = router({
  checkExternalAvailability: orgProcedure
    .input(
      z.object({
        emailAddress: z.string().email()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;

      const [emailUsername, emailDomain] = input.emailAddress.split('@') as [
        string,
        string
      ];

      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: and(
          eq(emailIdentities.username, emailUsername),
          eq(emailIdentities.domainName, emailDomain)
        ),
        columns: {
          id: true
        }
      });

      if (emailIdentityResponse) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email address already exists in UnInbox'
        });
      }

      return {
        available: true
      };
    }),
  validateExternalSmtpCredentials: orgProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
        authMethod: z.enum(['plain', 'login'])
      })
    )
    .mutation(async ({ input }) => {
      // timeout after 30 seconds
      const signal = AbortSignal.timeout(30_000);

      const result =
        await mailBridgeTrpcClient.smtp.validateSmtpCredentials.query(input, {
          signal
        });

      if (result.result.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.result.error
        });
      }

      return {
        valid: true
      };
    }),

  createNewExternalIdentity: orgProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        sendName: z.string().min(2).max(255),
        smtp: z.object({
          host: z.string(),
          port: z.number(),
          username: z.string(),
          password: z.string(),
          encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
          authMethod: z.enum(['plain', 'login'])
        }),
        routeToSpacesPublicIds: z.array(typeIdValidator('spaces')),
        canSend: z.object({
          anyone: z.boolean(),
          users: z.array(typeIdValidator('orgMembers')).optional(),
          teams: z.array(typeIdValidator('teams')).optional()
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, org } = ctx;
      const orgId = org.id;
      const { emailAddress, sendName, smtp, routeToSpacesPublicIds, canSend } =
        input;

      const [emailUsername, emailDomain] = emailAddress.split('@') as [
        string,
        string
      ];

      if (canSend.anyone && !canSend.users && !canSend.teams) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one user or team must be allowed to send'
        });
      }

      const signal = AbortSignal.timeout(30_000);

      // verify smtp again
      const smtpVerificationResult =
        await mailBridgeTrpcClient.smtp.validateSmtpCredentials.query(
          input.smtp,
          { signal }
        );

      if (smtpVerificationResult.result.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: smtpVerificationResult.result.error
        });
      }

      // create email routing rule
      const newRoutingRulePublicId = typeIdGenerator('emailRoutingRules');
      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newRoutingRulePublicId,
        orgId: orgId,
        createdBy: org.memberId,
        name: emailUsername,
        description: `Email routing rule for external address: ${emailUsername}@${emailDomain}`
      });

      // create email identity
      const emailIdentityPublicId = typeIdGenerator('emailIdentities');
      const mailDomains = env.MAIL_DOMAINS;
      const fwdDomain = mailDomains.fwd[0];
      const newForwardingAddress = `${nanoIdToken()}@${fwdDomain}`;
      // create address
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: emailIdentityPublicId,
          orgId: orgId,
          createdBy: org.memberId,
          username: emailUsername,
          domainName: emailDomain,
          domainId: null,
          routingRuleId: Number(insertEmailRoutingRule.insertId),
          forwardingAddress: newForwardingAddress,
          sendName: sendName,
          isCatchAll: false
        });

      // create email routing rule destinations
      type InsertRoutingRuleDestination = InferInsertModel<
        typeof emailRoutingRulesDestinations
      >;
      const routingRuleInsertValues: InsertRoutingRuleDestination[] = [];

      const destinationSpaceIdsResponse = await db.query.spaces.findMany({
        where: inArray(spaces.publicId, routeToSpacesPublicIds),
        columns: {
          id: true
        }
      });

      destinationSpaceIdsResponse.forEach((space) => {
        const newRoutingRuleDestinationPublicId = typeIdGenerator(
          'emailRoutingRuleDestinations'
        );
        routingRuleInsertValues.push({
          publicId: newRoutingRuleDestinationPublicId,
          orgId: orgId,
          ruleId: +insertEmailRoutingRule.insertId,
          spaceId: space.id
        });
      });
      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      // create email Authorizations
      type InsertEmailIdentityAuthorizedInsert = InferInsertModel<
        typeof emailIdentitiesAuthorizedSenders
      >;
      const emailIdentityAuthorizedInsertObjects: InsertEmailIdentityAuthorizedInsert[] =
        [];

      if (canSend.anyone) {
        destinationSpaceIdsResponse.forEach((space) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            spaceId: space.id
          });
        });
      } else {
        const orgMemberIdsResponse =
          canSend.users && canSend.users.length > 0
            ? await db.query.orgMembers.findMany({
                where: inArray(orgMembers.publicId, canSend.users),
                columns: {
                  id: true
                }
              })
            : [];
        orgMemberIdsResponse.forEach((orgMember) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            orgMemberId: orgMember.id
          });
        });

        const teamIdsResponse =
          canSend.teams && canSend.teams.length > 0
            ? await db.query.teams.findMany({
                where: inArray(teams.publicId, canSend.teams),
                columns: {
                  id: true
                }
              })
            : [];
        teamIdsResponse.forEach((userTeam) => {
          emailIdentityAuthorizedInsertObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            teamId: userTeam.id
          });
        });
      }

      if (emailIdentityAuthorizedInsertObjects.length > 0) {
        await db
          .insert(emailIdentitiesAuthorizedSenders)
          .values(emailIdentityAuthorizedInsertObjects);
      }

      const emailIdentityExternalPublicId = typeIdGenerator(
        'emailIdentitiesExternal'
      );
      const insertExternalCredentials = await db
        .insert(emailIdentityExternal)
        .values({
          publicId: emailIdentityExternalPublicId,
          orgId: orgId,
          host: smtp.host,
          port: smtp.port,
          username: smtp.username,
          password: smtp.password,
          encryption: smtp.encryption,
          authMethod: smtp.authMethod,
          createdBy: org.memberId,
          nickname: sendName
        });

      await db
        .update(emailIdentities)
        .set({
          externalCredentialsId: Number(insertExternalCredentials.insertId)
        })
        .where(
          eq(emailIdentities.id, Number(insertEmailIdentityResponse.insertId))
        );

      return {
        emailIdentity: emailIdentityPublicId
      };
    })
});
