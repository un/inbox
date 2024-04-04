import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { orgProcedure, router, accountProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import {
  emailIdentities,
  emailIdentitiesPersonal,
  accounts,
  emailRoutingRules,
  emailIdentitiesAuthorizedOrgMembers,
  emailRoutingRulesDestinations
} from '@u22n/database/schema';

import { orgMembers } from '@u22n/database/schema';
import { useRuntimeConfig } from '#imports';
import type { MailDomains } from '../../../types';
import { nanoIdToken, typeIdGenerator, typeIdValidator } from '@u22n/utils';

export const addressRouter = router({
  getPersonalAddresses: accountProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, account } = ctx;
      const accountId = account?.id;
      if (!accountId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'account not found'
        });
      }

      const accountsEmailIdentitiesPersonal =
        await db.query.emailIdentitiesPersonal.findMany({
          where: eq(emailIdentitiesPersonal.accountId, accountId),
          columns: {
            publicId: true
          },
          with: {
            org: {
              columns: {
                publicId: true,
                avatarTimestamp: true,
                name: true,
                shortcode: true
              }
            },
            emailIdentity: {
              columns: {
                publicId: true,
                sendName: true,
                username: true,
                domainName: true
              }
            }
          }
        });

      const mailDomains = useRuntimeConfig().mailDomains as MailDomains;
      const consumedDomains =
        accountsEmailIdentitiesPersonal.map(
          (identity) => identity.emailIdentity.domainName
        ) || [];
      const availableFreeDomains = mailDomains.free
        .filter((domain) => !consumedDomains.includes(domain))
        .map((domain) => domain);
      const availablePremiumDomains = mailDomains.premium
        .filter((domain) => !consumedDomains.includes(domain))
        .map((domain) => domain);
      const accountObject = await db.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: {
          username: true
        }
      });

      return {
        identities: accountsEmailIdentitiesPersonal,
        available: {
          free: availableFreeDomains,
          premium: availablePremiumDomains
        },
        username: accountObject?.username
      };
    }),
  claimPersonalAddress: orgProcedure
    .input(z.object({ emailIdentity: z.string().min(3) }).strict())
    .mutation(async ({ ctx, input }) => {
      const { db, account, org } = ctx;
      if (!account || !org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const accountId = account?.id;
      const orgId = org.id;

      const accountOrgMembership = org.members.find(
        (member) => member.accountId === accountId
      );
      if (!accountOrgMembership) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account Organization Member ID is not defined'
        });
      }

      const mailDomains = useRuntimeConfig().mailDomains as MailDomains;

      // Check the accounts already claimed personal addresses
      const accountsEmailIdentitiesPersonal =
        await db.query.emailIdentitiesPersonal.findMany({
          where: eq(emailIdentitiesPersonal.accountId, accountId),
          columns: {
            publicId: true
          },
          with: {
            org: {
              columns: {
                name: true,
                publicId: true,
                shortcode: true
              }
            },
            emailIdentity: {
              columns: {
                publicId: true,
                sendName: true,
                username: true,
                domainName: true
              }
            }
          }
        });

      const consumedDomains =
        accountsEmailIdentitiesPersonal.map(
          (identity) => identity.emailIdentity.domainName
        ) || [];

      const availablePublicDomains = mailDomains.free
        .filter((domain) => !consumedDomains.includes(domain))
        .map((domain) => domain);

      const availablePremiumDomains = mailDomains.premium
        .filter((domain) => !consumedDomains.includes(domain))
        .map((domain) => domain);

      const availableDomains = [
        ...availablePublicDomains,
        ...availablePremiumDomains
      ];

      const emailIdentityDomain = input.emailIdentity.split('@')[1] || '';

      if (!availableDomains.includes(emailIdentityDomain)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Domain is not available or already claimed'
        });
      }

      // get the account orgMemberProfile profile
      const accountOrgMembershipResponse = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, accountOrgMembership.id),
        columns: {},
        with: {
          profile: {
            columns: {
              firstName: true,
              lastName: true
            }
          },
          account: {
            columns: {
              username: true,
              publicId: true
            }
          }
        }
      });
      if (
        !accountOrgMembershipResponse ||
        !accountOrgMembershipResponse.account
      ) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account not found'
        });
      }

      const orgMemberProfile = accountOrgMembershipResponse.profile;
      const username =
        accountOrgMembershipResponse.account.username ||
        accountOrgMembershipResponse.account.publicId;
      const rootUserEmailAddress = `${username}@${emailIdentityDomain}`;
      const sendName = `${orgMemberProfile?.firstName} ${orgMemberProfile?.lastName}`;

      const newRoutingRulePublicId = typeIdGenerator('emailRoutingRules');
      const routingRuleInsertResponse = await db
        .insert(emailRoutingRules)
        .values({
          publicId: newRoutingRulePublicId,
          orgId: orgId,
          name: `Delivery of emails to ${rootUserEmailAddress}`,
          description: 'This route helps deliver @uninbox emails to users',
          createdBy: accountOrgMembership.id
        });
      const newRoutingRuleDestinationPublicId = typeIdGenerator(
        'emailRoutingRuleDestinations'
      );
      await db.insert(emailRoutingRulesDestinations).values({
        publicId: newRoutingRuleDestinationPublicId,
        orgId: orgId,
        ruleId: +routingRuleInsertResponse.insertId,
        orgMemberId: accountOrgMembership.id
      });

      const newEmailIdentityPublicId = typeIdGenerator('emailIdentities');
      const fwdDomain = mailDomains.fwd[0];
      const newForwardingAddress = `${nanoIdToken}@${fwdDomain}`;
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: newEmailIdentityPublicId,
          orgId: orgId,
          username: username,
          domainName: emailIdentityDomain,
          sendName: sendName,
          isCatchAll: false,
          personalEmailIdentityId: null,
          routingRuleId: Number(routingRuleInsertResponse.insertId),
          forwardingAddress: newForwardingAddress,
          createdBy: accountOrgMembership.id
        });

      const newPersonalEmailIdentityPublicId = typeIdGenerator(
        'emailIdentitiesPersonal'
      );
      const newPersonalEmailIdentity = await db
        .insert(emailIdentitiesPersonal)
        .values({
          publicId: newPersonalEmailIdentityPublicId,
          accountId: accountId,
          orgId: orgId,
          emailIdentityId: +insertEmailIdentityResponse.insertId
        });

      await db
        .update(emailIdentities)
        .set({
          personalEmailIdentityId: +newPersonalEmailIdentity.insertId
        })
        .where(eq(emailIdentities.id, +insertEmailIdentityResponse.insertId));

      await db.insert(emailIdentitiesAuthorizedOrgMembers).values({
        orgId: orgId,
        addedBy: accountOrgMembership.id,
        identityId: +insertEmailIdentityResponse.insertId,
        orgMemberId: accountOrgMembership.id
      });

      return {
        success: true,
        emailIdentity: rootUserEmailAddress
      };
    }),
  editSendName: orgProcedure
    .input(
      z
        .object({
          emailIdentityPublicId: typeIdValidator('emailIdentities'),
          newSendName: z.string().min(1)
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, account, org } = ctx;
      if (!account || !org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account or Organization is not defined'
        });
      }
      const accountId = account?.id;

      const accountOrgMembershipResponse = org.members.find(
        (member) => member.accountId === accountId
      );
      if (!accountOrgMembershipResponse) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Account Organization Member ID is not defined'
        });
      }

      // get the email identity and list of authorized accounts
      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, input.emailIdentityPublicId),
        columns: {
          id: true
        },
        with: {
          authorizedOrgMembers: {
            columns: {
              orgMemberId: true
            },
            with: {
              orgMember: {
                columns: {
                  id: true
                }
              }
            }
          }
        }
      });

      if (!emailIdentityResponse) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Email Identity not found'
        });
      }
      const authorizedOrgMembersIds =
        emailIdentityResponse.authorizedOrgMembers.map(
          (authorizedOrgMember) => authorizedOrgMember.orgMember?.id
        );
      if (!authorizedOrgMembersIds.includes(accountOrgMembershipResponse.id)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Org Member ID is not authorized'
        });
      }
      await db
        .update(emailIdentities)
        .set({ sendName: input.newSendName })
        .where(eq(emailIdentities.id, emailIdentityResponse.id));
      return {
        success: true
      };
    })
});
