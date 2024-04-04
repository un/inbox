import { mailBridgeTrpcClient } from '../../../../utils/tRPCServerClients';
import { z } from 'zod';
import { router, orgProcedure } from '../../../trpc';
import { and, eq, inArray, type InferInsertModel } from '@u22n/database/orm';
import {
  orgMembers,
  groups,
  emailRoutingRules,
  emailRoutingRulesDestinations,
  emailIdentities,
  emailIdentitiesAuthorizedOrgMembers,
  emailIdentityExternal
} from '@u22n/database/schema';
import { nanoIdToken, typeIdGenerator, typeIdValidator } from '@u22n/utils';
import { TRPCError } from '@trpc/server';
import type { MailDomains } from '../../../../types';
import { useRuntimeConfig } from '#imports';

export const emailIdentityExternalRouter = router({
  checkExternalAvailability: orgProcedure
    .input(
      z.object({
        emailAddress: z.string().email()
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.account || !ctx.org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const { db } = ctx;

      const [emailUsername, emailDomain] = input.emailAddress.split('@');
      if (!emailDomain || !emailUsername) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email address'
        });
      }

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
      const result =
        await mailBridgeTrpcClient.smtp.validateSmtpCredentials.mutate(input);

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
        sendName: z.string().min(3).max(255),
        smtp: z.object({
          host: z.string(),
          port: z.number(),
          username: z.string(),
          password: z.string(),
          encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
          authMethod: z.enum(['plain', 'login'])
        }),
        routeToOrgMemberPublicIds: z
          .array(typeIdValidator('orgMembers'))
          .optional(),
        routeToGroupsPublicIds: z.array(typeIdValidator('groups')).optional()
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
      const {
        sendName,
        smtp,
        routeToOrgMemberPublicIds,
        routeToGroupsPublicIds
      } = input;

      const [emailUsername, emailDomain] = input.emailAddress.split('@');
      if (!emailDomain || !emailUsername) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email address'
        });
      }

      if (!routeToOrgMemberPublicIds && !routeToGroupsPublicIds) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must route to at least one user or group'
        });
      }

      // verify smtp again
      const smtpVerificationResult =
        await mailBridgeTrpcClient.smtp.validateSmtpCredentials.mutate(
          input.smtp
        );

      if (smtpVerificationResult.result.error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: smtpVerificationResult.result.error
        });
      }

      // get orgmembers and groups
      const orgMemberObjects: { id: number; hasDefault: boolean }[] = [];
      const orgMemberIdsResponse =
        routeToOrgMemberPublicIds && routeToOrgMemberPublicIds.length > 0
          ? await db.query.orgMembers.findMany({
              where: inArray(orgMembers.publicId, routeToOrgMemberPublicIds),
              columns: {
                id: true
              },
              with: {
                authorizedEmailIdentities: {
                  columns: {
                    default: true
                  }
                }
              }
            })
          : [];
      orgMemberIdsResponse.forEach((orgMember) => {
        orgMemberObjects.push({
          id: orgMember.id,
          hasDefault: orgMember.authorizedEmailIdentities.some(
            (identity) => identity.default
          )
        });
      });

      const userGroupObjects: { id: number; hasDefault: boolean }[] = [];
      const userGroupIdsResponse =
        routeToGroupsPublicIds && routeToGroupsPublicIds.length > 0
          ? await db.query.groups.findMany({
              where: inArray(groups.publicId, routeToGroupsPublicIds),
              columns: {
                id: true
              },
              with: {
                authorizedEmailIdentities: {
                  columns: {
                    default: true
                  }
                }
              }
            })
          : [];
      userGroupIdsResponse.forEach((userGroup) => {
        userGroupObjects.push({
          id: userGroup.id,
          hasDefault: userGroup.authorizedEmailIdentities.some(
            (identity) => identity.default
          )
        });
      });

      // create email routing rule
      const newRoutingRulePublicId = typeIdGenerator('emailRoutingRules');
      const insertEmailRoutingRule = await db.insert(emailRoutingRules).values({
        publicId: newRoutingRulePublicId,
        orgId: orgId,
        createdBy: org.memberId,
        name: emailUsername,
        description: `Email routing rule for external address: ${emailUsername}@${emailDomain}`
      });

      type InsertRoutingRuleDestination = InferInsertModel<
        typeof emailRoutingRulesDestinations
      >;
      // create email routing rule destinations
      const routingRuleInsertValues: InsertRoutingRuleDestination[] = [];
      if (orgMemberObjects.length > 0) {
        orgMemberObjects.forEach((orgMemberObject) => {
          const newRoutingRuleDestinationPublicId = typeIdGenerator(
            'emailRoutingRuleDestinations'
          );
          routingRuleInsertValues.push({
            publicId: newRoutingRuleDestinationPublicId,
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            orgMemberId: orgMemberObject.id
          });
        });
      }
      if (userGroupObjects.length > 0) {
        userGroupObjects.forEach((userGroupObject) => {
          const newRoutingRuleDestinationPublicId = typeIdGenerator(
            'emailRoutingRuleDestinations'
          );
          routingRuleInsertValues.push({
            publicId: newRoutingRuleDestinationPublicId,
            orgId: orgId,
            ruleId: +insertEmailRoutingRule.insertId,
            groupId: userGroupObject.id
          });
        });
      }

      await db
        .insert(emailRoutingRulesDestinations)
        .values(routingRuleInsertValues);

      const emailIdentityPublicId = typeIdGenerator('emailIdentities');
      const mailDomains = useRuntimeConfig().mailDomains as MailDomains;
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

      type InsertEmailIdentityAuthorizedOrgMembers = InferInsertModel<
        typeof emailIdentitiesAuthorizedOrgMembers
      >;
      const emailIdentityAuthorizedOrgMembersObjects: InsertEmailIdentityAuthorizedOrgMembers[] =
        [];

      if (orgMemberObjects.length > 0) {
        orgMemberObjects.forEach((orgMemberObject) => {
          emailIdentityAuthorizedOrgMembersObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            orgMemberId: orgMemberObject.id,
            default: !orgMemberObject.hasDefault
          });
        });
      }

      if (userGroupObjects.length > 0) {
        userGroupObjects.forEach((userGroupObject) => {
          emailIdentityAuthorizedOrgMembersObjects.push({
            orgId: orgId,
            identityId: +insertEmailIdentityResponse.insertId,
            addedBy: org.memberId,
            groupId: userGroupObject.id,
            default: !userGroupObject.hasDefault
          });
        });
      }

      if (emailIdentityAuthorizedOrgMembersObjects.length > 0) {
        await db
          .insert(emailIdentitiesAuthorizedOrgMembers)
          .values(emailIdentityAuthorizedOrgMembersObjects);
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
