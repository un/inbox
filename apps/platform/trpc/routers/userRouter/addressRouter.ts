import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { orgProcedure, router, userProcedure } from '../../trpc';
import { eq } from '@u22n/database/orm';
import {
  postalServers,
  emailIdentities,
  emailIdentitiesPersonal,
  users,
  emailRoutingRules,
  orgPostalConfigs,
  emailIdentitiesAuthorizedUsers,
  emailRoutingRulesDestinations
} from '@u22n/database/schema';
import { nanoId } from '@u22n/utils';
import { MailDomainEntries } from '@u22n/types';
import { orgMembers } from '@u22n/database/schema';
import { mailBridgeTrpcClient, useRuntimeConfig } from '#imports';

export const addressRouter = router({
  getPersonalAddresses: userProcedure
    .input(z.object({}).strict())
    .query(async ({ ctx }) => {
      const { db, user } = ctx;
      const userId = user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not found'
        });
      }

      const usersEmailIdentitiesPersonal =
        await db.query.emailIdentitiesPersonal.findMany({
          where: eq(emailIdentitiesPersonal.userId, userId),
          columns: {
            publicId: true
          },
          with: {
            org: {
              columns: {
                publicId: true,
                avatarId: true,
                name: true,
                slug: true
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

      const mailDomainPublic = useRuntimeConfig().public
        .mailDomainPublic as MailDomainEntries[];
      const mailDomainPremium = useRuntimeConfig().public
        .mailDomainPremium as MailDomainEntries[];

      const consumedDomains =
        usersEmailIdentitiesPersonal.map(
          (identity) => identity.emailIdentity.domainName
        ) || [];

      const availablePublicDomains = mailDomainPublic
        .filter((domain) => !consumedDomains.includes(domain.name))
        .map((domain) => domain.name);

      const availablePremiumDomains = mailDomainPremium
        .filter((domain) => !consumedDomains.includes(domain.name))
        .map((domain) => domain.name);

      const userObject = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          username: true
        }
      });

      return {
        identities: usersEmailIdentitiesPersonal,
        available: {
          public: availablePublicDomains,
          premium: availablePremiumDomains
        },
        username: userObject?.username
      };
    }),
  claimPersonalAddress: orgProcedure
    .input(z.object({ emailIdentity: z.string().min(3) }).strict())
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      if (!user || !org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const userId = user?.id;
      const orgId = org.id;
      const orgPublicId = org.publicId;
      const userOrgMembership = org.members.find(
        (member) => member.userId === userId
      );
      if (!userOrgMembership) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User Organization Member ID is not defined'
        });
      }

      const mailDomainPublic = useRuntimeConfig().public
        .mailDomainPublic as MailDomainEntries[];
      const mailDomainPremium = useRuntimeConfig().public
        .mailDomainPremium as MailDomainEntries[];

      // Check the users already claimed personal addresses
      const usersEmailIdentitiesPersonal =
        await db.query.emailIdentitiesPersonal.findMany({
          where: eq(emailIdentitiesPersonal.userId, userId),
          columns: {
            publicId: true
          },
          with: {
            org: {
              columns: {
                name: true,
                publicId: true,
                slug: true
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
        usersEmailIdentitiesPersonal.map(
          (identity) => identity.emailIdentity.domainName
        ) || [];

      const availablePublicDomains = mailDomainPublic
        .filter((domain) => !consumedDomains.includes(domain.name))
        .map((domain) => domain.name);

      const availablePremiumDomains = mailDomainPremium
        .filter((domain) => !consumedDomains.includes(domain.name))
        .map((domain) => domain.name);
      const availableDomains = [
        ...availablePublicDomains,
        ...availablePremiumDomains
      ];

      const emailIdentityDomain = input.emailIdentity.split('@')[1];

      if (!availableDomains.includes(emailIdentityDomain)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Domain is not available or already claimed'
        });
      }

      // get the user profile
      const userResponse = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.id, userOrgMembership.id),
        columns: {},
        with: {
          profile: {
            columns: {
              firstName: true,
              lastName: true
            }
          },
          user: {
            columns: {
              username: true,
              publicId: true
            }
          }
        }
      });
      if (!userResponse || !userResponse.user) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User not found'
        });
      }

      const userProfile = userResponse.profile;
      const username = userResponse.user.username || userResponse.user.publicId;
      const rootUserEmailAddress = `${username}@${emailIdentityDomain}`;
      const sendName = `${userProfile?.firstName} ${userProfile?.lastName}`;

      const createMailBridgeOrgResponse =
        await mailBridgeTrpcClient.postal.org.createOrg.mutate({
          orgId: orgId,
          orgPublicId: orgPublicId,
          personalOrg: true
        });

      const orgPostalConfigResponse = await db.query.orgPostalConfigs.findFirst(
        {
          where: eq(orgPostalConfigs.orgId, orgId),
          columns: {
            id: true
          }
        }
      );

      if (!orgPostalConfigResponse) {
        await db.insert(orgPostalConfigs).values({
          orgId: orgId,
          host: createMailBridgeOrgResponse.config.host,
          ipPools: createMailBridgeOrgResponse.config.ipPools,
          defaultIpPool: createMailBridgeOrgResponse.config.defaultIpPool
        });
      }

      // creates the new root email address
      const createMailBridgeRootEmailResponse =
        await mailBridgeTrpcClient.postal.emailRoutes.createRootEmailAddress.mutate(
          {
            orgId: orgId,
            rootDomainName: emailIdentityDomain,
            sendName: sendName,
            serverPublicId:
              createMailBridgeOrgResponse.postalServer.serverPublicId,
            userId: userOrgMembership.id,
            username: username.toLocaleLowerCase()
          }
        );

      const newroutingRulePublicId = nanoId();
      const routingRuleInsertResponse = await db
        .insert(emailRoutingRules)
        .values({
          publicId: newroutingRulePublicId,
          orgId: orgId,
          name: `Delivery of emails to ${rootUserEmailAddress}`,
          description: 'This route helps deliver @uninbox emails to users',
          createdBy: userOrgMembership.id
        });

      await db.insert(emailRoutingRulesDestinations).values({
        orgId: orgId,
        ruleId: +routingRuleInsertResponse.insertId,
        orgMemberId: userOrgMembership.id
      });

      const newEmailIdentityPublicId = nanoId();
      const insertEmailIdentityResponse = await db
        .insert(emailIdentities)
        .values({
          publicId: newEmailIdentityPublicId,
          orgId: orgId,
          username: username,
          domainName: emailIdentityDomain,
          routingRuleId: +routingRuleInsertResponse.insertId,
          sendName: sendName,
          isCatchAll: false,
          personalEmailIdentityId: null,
          createdBy: userOrgMembership.id
        });

      const newPersonalEmailIdentityPublicId = nanoId();
      const newPersonalEmailIdentity = await db
        .insert(emailIdentitiesPersonal)
        .values({
          publicId: newPersonalEmailIdentityPublicId,
          userId: userId,
          orgId: orgId,
          emailIdentityId: +insertEmailIdentityResponse.insertId
        });

      await db
        .update(emailIdentities)
        .set({
          personalEmailIdentityId: +newPersonalEmailIdentity.insertId
        })
        .where(eq(emailIdentities.id, +insertEmailIdentityResponse.insertId));

      await db.insert(emailIdentitiesAuthorizedUsers).values({
        orgId: orgId,
        addedBy: userOrgMembership.id,
        identityId: +insertEmailIdentityResponse.insertId,
        orgMemberId: userOrgMembership.id
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
          emailIdentityPublicId: z.string().min(3),
          newSendName: z.string().min(1)
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      if (!user || !org) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User or Organization is not defined'
        });
      }
      const userId = user?.id;

      const userOrgMembership = org.members.find(
        (member) => member.userId === userId
      );
      if (!userOrgMembership) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User Organization Member ID is not defined'
        });
      }

      // get the email identity and list of authorized users
      const emailIdentityResponse = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, input.emailIdentityPublicId),
        columns: {
          id: true
        },
        with: {
          authorizedUsers: {
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
      const authorizedUsersOrgMembersUserIds =
        emailIdentityResponse.authorizedUsers.map((user) => user.orgMember?.id);
      if (!authorizedUsersOrgMembersUserIds.includes(userId)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'User ID is not authorized'
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
