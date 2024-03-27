import { z } from 'zod';
import { router, protectedProcedure } from '~/trpc/trpc';
import {
  emailIdentities,
  postalServers,
  type ConvoEntryMetadata,
  convos,
  convoEntries,
  type ConvoEntryMetadataEmailAddress,
  contacts,
  emailIdentitiesAuthorizedOrgMembers,
  orgMembers,
  groups,
  type ConvoEntryMetadataMissingParticipant,
  orgs
} from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import { and, eq } from '@u22n/database/orm';
import type { PostalConfig } from '~/types';
import { useRuntimeConfig } from '#imports';
import { tiptapHtml, tiptapVue3 } from '@u22n/tiptap';
import { tipTapExtensions } from '@u22n/tiptap/extensions';

export const sendMailRouter = router({
  sendConvoEntryEmail: protectedProcedure
    .input(
      z.object({
        orgId: z.number(),
        convoId: z.number(),
        entryId: z.number(),
        sendAsEmailIdentityPublicId: typeIdValidator('emailIdentities'),
        newConvoToParticipantPublicId:
          typeIdValidator('convoParticipants').optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const postalConfig = config.postal as PostalConfig;

      if (postalConfig.localMode === true) {
        return {
          success: true,
          metadata: {
            email: {
              to: [{ id: 0, type: 'emailIdentity' }],
              from: [{ id: 1, type: 'emailIdentity' }],
              cc: [],
              messageId: 'localModeMessageId',
              postalMessages: [
                {
                  recipient: 'localModeRecipient',
                  id: 1,
                  token: 'localModeToken',
                  postalMessageId: 'localModeMessageId'
                }
              ]
            }
          }
        };
      }

      const { orgId, convoId, entryId, sendAsEmailIdentityPublicId } = input;

      const orgQueryResponse = await db.query.orgs.findFirst({
        where: eq(orgs.id, orgId),
        columns: {
          publicId: true
        }
      });
      if (!orgQueryResponse) {
        console.error('🚨 org not found', { orgId, convoId, entryId });
        return {
          success: false
        };
      }

      // first we get the convo and its participants, if theres no contact participants, we assume theres no email to be sent and just return
      const convoResponse = await db.query.convos.findFirst({
        where: eq(convos.id, convoId),
        columns: {
          orgId: true
        },
        with: {
          participants: {
            columns: {
              publicId: true,
              orgMemberId: true,
              groupId: true,
              contactId: true
            }
          }
        }
      });

      if (!convoResponse) {
        console.error('🚨 convo not found', {
          orgId,
          convoId,
          entryId,
          sendAsEmailIdentityPublicId
        });
        return {
          success: false
        };
      }

      const contactConvoParticipants = convoResponse.participants.filter(
        (participant) => participant.contactId
      );
      const orgMemberParticipants = convoResponse.participants.filter(
        (participant) => participant.orgMemberId
      );
      const groupParticipants = convoResponse.participants.filter(
        (participant) => participant.groupId
      );

      if (
        convoResponse.participants.length === 0 ||
        !contactConvoParticipants.length ||
        contactConvoParticipants.length === 0
      ) {
        return {
          success: true
        };
      }

      const convoEntryResponse = await db.query.convoEntries.findFirst({
        where: eq(convoEntries.id, entryId),
        columns: {
          convoId: true,
          body: true,
          bodyPlainText: true,
          author: true,
          replyToId: true,
          subjectId: true,
          metadata: true,
          emailMessageId: true
        },
        with: {
          subject: {
            columns: {
              subject: true
            }
          },
          attachments: {
            columns: {
              id: true,
              publicId: true,
              fileName: true,
              type: true
            }
          },
          replyTo: {
            columns: {
              entrySourceId: true
            },
            with: {
              convoMessageSource: {
                columns: {
                  emailMessageId: true,
                  metadata: true
                }
              }
            }
          }
        }
      });

      if (!convoEntryResponse) {
        console.error('🚨 convoEntry not found', {
          orgId,
          convoId,
          entryId,
          sendAsEmailIdentityPublicId
        });
        return {
          success: false
        };
      }

      const sendAsEmailIdentity = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, sendAsEmailIdentityPublicId),
        columns: {
          id: true,
          publicId: true,
          username: true,
          domainName: true,
          sendName: true,
          personalEmailIdentityId: true
        }
      });

      if (!sendAsEmailIdentity) {
        console.error('🚨 sendAsEmailIdentity not found', {
          orgId,
          convoId,
          entryId,
          sendAsEmailIdentityPublicId
        });
        return {
          success: false
        };
      }

      //* Handle getting the email addresses

      // if this is a new convo, we need to pass in the particpants ID to get their email address
      // if(input.newConvoToParticipantId) {
      // }

      const convoMetadataFromAddress: ConvoEntryMetadataEmailAddress = {
        id: +sendAsEmailIdentity.id,
        type: 'emailIdentity',
        publicId: sendAsEmailIdentity.publicId,
        email: `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`
      };
      const convoSender = `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`;
      const convoFrom = `${sendAsEmailIdentity.sendName} <${convoSender}>`;
      let convoMetadataToAddress: ConvoEntryMetadataEmailAddress | undefined;
      let convoToAddress: string | undefined;
      const convoMetadataCcAddresses: ConvoEntryMetadataEmailAddress[] = [];
      const convoCcAddresses: string[] = [];

      const missingEmailIdentitiesWarnings: ConvoEntryMetadataMissingParticipant[] =
        [];

      //* CONVO EMAIL PARTICIPANTS SECTION

      // get the email addresses for all contacts
      await Promise.all(
        contactConvoParticipants.map(async (contactParticipant) => {
          const contactResponse = await db.query.contacts.findFirst({
            where: eq(contacts.id, contactParticipant.contactId!),
            columns: {
              id: true,
              publicId: true,
              emailUsername: true,
              emailDomain: true
            }
          });
          if (contactResponse) {
            if (
              contactParticipant.publicId ===
              input.newConvoToParticipantPublicId
            ) {
              convoMetadataToAddress = {
                id: Number(contactResponse.id),
                type: 'contact',
                publicId: contactResponse.publicId,
                email: `${contactResponse.emailUsername}@${contactResponse.emailDomain}`
              };
              convoToAddress = `${contactResponse.emailUsername}@${contactResponse.emailDomain}`;
            } else {
              convoMetadataCcAddresses.push({
                id: Number(contactResponse.id),
                type: 'contact',
                publicId: contactResponse.publicId,
                email: `${contactResponse.emailUsername}@${contactResponse.emailDomain}`
              });
              convoCcAddresses.push(
                `${contactResponse.emailUsername}@${contactResponse.emailDomain}`
              );
            }
          }
        })
      );

      // get the default email addresses for all users
      if (orgMemberParticipants.length) {
        await Promise.all(
          orgMemberParticipants.map(async (orgMemberParticipant) => {
            const emailIdentityResponse =
              await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
                where: and(
                  eq(
                    emailIdentitiesAuthorizedOrgMembers.orgMemberId,
                    orgMemberParticipant.orgMemberId!
                  ),
                  eq(emailIdentitiesAuthorizedOrgMembers.default, true)
                ),
                columns: {
                  id: true
                },
                with: {
                  identity: {
                    columns: {
                      id: true,
                      publicId: true,
                      username: true,
                      domainName: true
                    }
                  }
                }
              });
            if (!emailIdentityResponse) {
              const memberProfile = await db.query.orgMembers.findFirst({
                where: eq(orgMembers.id, orgMemberParticipant.orgMemberId!),
                columns: {
                  publicId: true
                },
                with: {
                  profile: {
                    columns: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              });
              if (memberProfile) {
                missingEmailIdentitiesWarnings.push({
                  type: 'user',
                  publicId: memberProfile.publicId,
                  name: `${memberProfile.profile.firstName} ${memberProfile.profile.lastName}`
                });
                return;
              }
            }
            if (emailIdentityResponse) {
              if (
                orgMemberParticipant.publicId ===
                input.newConvoToParticipantPublicId
              ) {
                convoMetadataToAddress = {
                  id: Number(emailIdentityResponse.identity.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.identity.publicId,
                  email: `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                };
                convoToAddress = `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`;
              } else {
                convoMetadataCcAddresses.push({
                  id: Number(emailIdentityResponse.identity.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.identity.publicId,
                  email: `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                });
                convoCcAddresses.push(
                  `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                );
              }
            }
          })
        );
      }

      // get the default email addresses for all groups
      if (groupParticipants.length) {
        await Promise.all(
          groupParticipants.map(async (groupParticipant) => {
            const emailIdentityResponse =
              await db.query.emailIdentitiesAuthorizedOrgMembers.findFirst({
                where: and(
                  eq(
                    emailIdentitiesAuthorizedOrgMembers.groupId,
                    groupParticipant.groupId!
                  ),
                  eq(emailIdentitiesAuthorizedOrgMembers.default, true)
                ),
                columns: {
                  id: true
                },
                with: {
                  identity: {
                    columns: {
                      id: true,
                      publicId: true,
                      username: true,
                      domainName: true
                    }
                  }
                }
              });
            if (!emailIdentityResponse) {
              const orgGroupResponse = await db.query.groups.findFirst({
                where: eq(groups.id, groupParticipant.groupId!),
                columns: {
                  publicId: true,
                  name: true
                }
              });

              if (orgGroupResponse) {
                missingEmailIdentitiesWarnings.push({
                  type: 'group',
                  publicId: orgGroupResponse.publicId,
                  name: orgGroupResponse.name
                });
                return;
              }
            }
            if (emailIdentityResponse) {
              if (
                groupParticipant.publicId ===
                input.newConvoToParticipantPublicId
              ) {
                convoMetadataToAddress = {
                  id: Number(emailIdentityResponse.identity.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.identity.publicId,
                  email: `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                };
                convoToAddress = `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`;
              } else {
                convoMetadataCcAddresses.push({
                  id: Number(emailIdentityResponse.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.identity.publicId,
                  email: `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                });
                convoCcAddresses.push(
                  `${emailIdentityResponse.identity.username}@${emailIdentityResponse.identity.domainName}`
                );
              }
            }
          })
        );
      }

      // END CONVO EMAIL PARTICIPANTS SECTION

      // remove TO email address from CCs if it exists

      if (!convoMetadataToAddress) {
        const replySourceMetadata = convoEntryResponse.replyTo
          ?.convoMessageSource?.metadata?.email?.from[0]
          ? convoEntryResponse.replyTo.convoMessageSource.metadata.email.from[0]
          : convoMetadataFromAddress;

        convoMetadataToAddress = {
          id: replySourceMetadata.id,
          type: replySourceMetadata.type,
          publicId: replySourceMetadata.publicId,
          email: replySourceMetadata.email
        };
      }
      if (!convoToAddress) {
        const replySourceMetadata = convoEntryResponse.replyTo
          ?.convoMessageSource?.metadata?.email?.from[0]
          ? convoEntryResponse.replyTo.convoMessageSource.metadata.email.from[0]
          : convoMetadataFromAddress;

        convoToAddress = replySourceMetadata.email;
      }
      const convoCcAddressesFiltered = convoCcAddresses.filter(
        (emailAddress) => {
          return emailAddress !== convoToAddress && emailAddress !== convoFrom;
        }
      );

      //* get sending server details
      let postalServerUrl: string;
      let postalServerAPIKey: string;

      if (sendAsEmailIdentity.personalEmailIdentityId) {
        postalServerUrl = `https://${postalConfig.personalServerCredentials.apiUrl}/api/v1/send/message`;
        postalServerAPIKey = postalConfig.personalServerCredentials.apiKey;
      } else {
        const orgPostalServerResponse = await db.query.postalServers.findFirst({
          where: and(
            eq(postalServers.orgId, orgId),
            eq(postalServers.type, 'email')
          ),
          columns: {
            apiKey: true
          },
          with: {
            orgPostalConfigs: {
              columns: {
                host: true
              }
            }
          }
        });
        if (!orgPostalServerResponse) {
          console.error('🚨 orgPostalServerResponse not found');
          return {
            success: false
          };
        }
        postalServerAPIKey = orgPostalServerResponse.apiKey;
        const postalServerConfigItem = postalConfig.servers.find(
          (server) =>
            server.url === orgPostalServerResponse.orgPostalConfigs.host
        );
        postalServerUrl = `https://${postalServerConfigItem?.controlPanelSubDomain}.${postalServerConfigItem?.url}/api/v1/send/message`;
      }

      //* Attachments
      // expected postal type: { name: attachment["name"], content_type: attachment["content_type"], data: attachment["data"], base64: true }
      const attachments = convoEntryResponse.attachments;
      type PostalAttachmentType = {
        name: string;
        content_type: string;
        data: string;
        base64: boolean;
      };
      const postalAttachments: PostalAttachmentType[] = [];

      async function getAttachment(input: {
        orgPublicId: string;
        attachmentPublicId: string;
        fileName: string;
      }) {
        type GetUrlResponse = {
          url: string;
        };
        const downloadUrl = (await fetch(
          `${useRuntimeConfig().storage.url}/api/attachments/mailfetch`,
          {
            method: 'post',

            headers: {
              'Content-Type': 'application/json',
              Authorization: useRuntimeConfig().storage.key
            },
            body: JSON.stringify({
              orgPublicId: input.orgPublicId,
              attachmentPublicId: input.attachmentPublicId,
              filename: input.fileName
            })
          }
        ).then((res) => res.json())) as GetUrlResponse;
        if (!downloadUrl || !downloadUrl.url) {
          throw new Error('something went wrong getting the attachment URL');
        }

        try {
          const response = await fetch(downloadUrl.url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return base64;
        } catch (error) {
          console.error('Error downloading the presigned url file:', error);
          throw error; // Rethrow to handle it in the outer catch block
        }
      }
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            const base64 = await getAttachment({
              orgPublicId: orgQueryResponse.publicId!,
              attachmentPublicId: attachment.publicId,
              fileName: attachment.fileName
            });
            postalAttachments.push({
              name: attachment.fileName,
              content_type: attachment.type,
              data: base64,
              base64: true
            });
          } catch (error) {
            console.error('Error getting attachment:', error);
          }
        }
      }

      //* Prep and Send email

      const emailBodyHTML = tiptapHtml.generateHTML(
        convoEntryResponse.body as tiptapVue3.JSONContent,
        tipTapExtensions
      );
      const emailBodyPlainText = convoEntryResponse.bodyPlainText;

      const replyToEmailId =
        convoEntryResponse.replyTo?.convoMessageSource.emailMessageId || null;

      const emailHeaders: { [key: string]: string } = replyToEmailId
        ? {
            'In-Reply-To': `<${replyToEmailId}>`,
            References: `<${replyToEmailId}>`
          }
        : {};

      type PostalResponse =
        | {
            status: 'success';
            time: number;
            flags: any;
            data: {
              message_id: string;
              messages: {
                [email: string]: {
                  id: number;
                  token: string;
                };
              };
            };
          }
        | {
            status: 'parameter-error';
            time: number;
            flags: any;
            data: {
              message: string;
            };
          };
      const sendMailPostalResponse = (await fetch(postalServerUrl, {
        method: 'POST',
        headers: {
          'X-Server-API-Key': `${postalServerAPIKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [`${convoToAddress}`],
          cc: convoCcAddressesFiltered,
          from: convoFrom,
          sender: convoSender,
          subject: convoEntryResponse.subject?.subject || 'No Subject',
          plain_body: emailBodyPlainText,
          html_body: emailBodyHTML,
          attachments: postalAttachments,
          headers: emailHeaders
        })
      })
        .then((res) => res.json())
        .catch((e) => {
          console.error('🚨 error sending email', e);
        })) as PostalResponse;

      if (sendMailPostalResponse.status === 'success') {
        const transformedMessages = Object.entries(
          sendMailPostalResponse.data.messages
        ).map(([recipient, { id, token }]) => ({
          recipient,
          id,
          token
        }));

        const entryMetadata: ConvoEntryMetadata = {
          email: {
            to: [convoMetadataToAddress!],
            from: [convoMetadataFromAddress],
            cc: convoMetadataCcAddresses,
            messageId: sendMailPostalResponse.data.message_id,
            postalMessages: transformedMessages.map((message) => ({
              ...message,
              postalMessageId: sendMailPostalResponse.data.message_id
            }))
          }
        };

        await db
          .update(convoEntries)
          .set({
            metadata: entryMetadata
          })
          .where(eq(convoEntries.id, entryId));

        return {
          success: true,
          metadata: entryMetadata as ConvoEntryMetadata
        };
      } else {
        console.error(
          `🚨 attempted to send convoId: ${entryId} from convoId: ${convoId}, but got the following error`,
          sendMailPostalResponse.data.message
        );
        return {
          success: false
        };
      }
    }),
  sendNewEmail: protectedProcedure
    // to, cc, subject, bodyPlain, bodyHTML, attachmentIds, sendAsEmailIdentityPublicId
    .input(
      z.object({
        orgId: z.number(),
        convoId: z.number(),
        entryId: z.number(),
        sendAsEmailIdentityPublicId: typeIdValidator('emailIdentities'),
        toEmail: z.string().email(),
        ccEmail: z.array(z.string().email()).optional(),
        subject: z.string(),
        bodyPlainText: z.string(),
        bodyHtml: z.string(),
        attachments: z.array(
          z.object({
            orgPublicId: typeIdValidator('org'),
            attachmentPublicId: typeIdValidator('convoAttachments'),
            fileName: z.string(),
            fileType: z.string()
          })
        )
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const postalConfig = config.postal as PostalConfig;

      if (postalConfig.localMode === true) {
        return {
          success: true,
          metadata: {
            email: {
              to: [{ id: 0, type: 'emailIdentity' }],
              from: [{ id: 1, type: 'emailIdentity' }],
              cc: [],
              messageId: 'localModeMessageId',
              postalMessages: [
                {
                  recipient: 'localModeRecipient',
                  id: 1,
                  token: 'localModeToken',
                  postalMessageId: 'localModeMessageId'
                }
              ]
            }
          }
        };
      }

      const {
        orgId,
        convoId,
        entryId,
        sendAsEmailIdentityPublicId,
        toEmail,
        ccEmail,
        subject,
        bodyPlainText,
        bodyHtml,
        attachments
      } = input;

      const sendAsEmailIdentity = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, sendAsEmailIdentityPublicId),
        columns: {
          id: true,
          publicId: true,
          username: true,
          domainName: true,
          sendName: true,
          personalEmailIdentityId: true
        }
      });

      if (!sendAsEmailIdentity) {
        console.error('🚨 sendAsEmailIdentity not found');
        return {
          success: false
        };
      }

      const sendEmailAddress = `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`;
      const sendName = `${sendAsEmailIdentity.sendName} <${sendEmailAddress}>`;
      let postalServerUrl: string;
      let postalServerAPIKey: string;

      if (sendAsEmailIdentity.personalEmailIdentityId) {
        postalServerUrl = `https://${postalConfig.personalServerCredentials.apiUrl}/api/v1/send/message`;
        postalServerAPIKey = postalConfig.personalServerCredentials.apiKey;
      } else {
        const orgPostalServerResponse = await db.query.postalServers.findFirst({
          where: and(
            eq(postalServers.orgId, orgId),
            eq(postalServers.type, 'email')
          ),
          columns: {
            apiKey: true
          },
          with: {
            orgPostalConfigs: {
              columns: {
                host: true
              }
            }
          }
        });
        if (!orgPostalServerResponse) {
          console.error('🚨 orgPostalServerResponse not found');
          return {
            success: false
          };
        }
        postalServerAPIKey = orgPostalServerResponse.apiKey;
        const postalServerConfigItem = postalConfig.servers.find(
          (server) =>
            server.url === orgPostalServerResponse.orgPostalConfigs.host
        );
        postalServerUrl = `https://${postalServerConfigItem?.controlPanelSubDomain}.${postalServerConfigItem?.url}/api/v1/send/message`;
      }

      //* Attachments
      // expected postal type: { name: attachment["name"], content_type: attachment["content_type"], data: attachment["data"], base64: true }
      type PostalAttachmentType = {
        name: string;
        content_type: string;
        data: string;
        base64: boolean;
      };
      const postalAttachments: PostalAttachmentType[] = [];

      async function getAttachment(input: {
        orgPublicId: string;
        attachmentPublicId: string;
        fileName: string;
      }) {
        type GetUrlResponse = {
          url: string;
        };
        const downloadUrl = (await fetch(
          `${useRuntimeConfig().storage.url}/api/attachments/mailfetch`,
          {
            method: 'post',

            headers: {
              'Content-Type': 'application/json',
              Authorization: useRuntimeConfig().storage.key
            },
            body: JSON.stringify({
              orgPublicId: input.orgPublicId,
              attachmentPublicId: input.attachmentPublicId,
              filename: input.fileName
            })
          }
        ).then((res) => res.json())) as GetUrlResponse;
        if (!downloadUrl || !downloadUrl.url) {
          throw new Error('something went wrong getting the attachment URL');
        }

        try {
          const response = await fetch(downloadUrl.url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return base64;
        } catch (error) {
          console.error('Error downloading the presigned url file:', error);
          throw error; // Rethrow to handle it in the outer catch block
        }
      }
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            const base64 = await getAttachment({
              orgPublicId: attachment.orgPublicId,
              attachmentPublicId: attachment.attachmentPublicId,
              fileName: attachment.fileName
            });
            postalAttachments.push({
              name: attachment.fileName,
              content_type: attachment.fileType,
              data: base64,
              base64: true
            });
          } catch (error) {
            console.error('Error getting attachment:', error);
          }
        }
      }

      //* Send email

      type PostalResponse =
        | {
            status: 'success';
            time: number;
            flags: any;
            data: {
              message_id: string;
              messages: {
                [email: string]: {
                  id: number;
                  token: string;
                };
              };
            };
          }
        | {
            status: 'parameter-error';
            time: number;
            flags: any;
            data: {
              message: string;
            };
          };
      const sendMailPostalResponse = (await fetch(postalServerUrl, {
        method: 'POST',
        headers: {
          'X-Server-API-Key': `${postalServerAPIKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: [`${toEmail}`],
          cc: ccEmail,
          from: sendName,
          sender: sendEmailAddress,
          subject: subject,
          plain_body: bodyPlainText,
          html_body: bodyHtml,
          attachments: postalAttachments
        })
      })
        .then((res) => res.json())
        .catch((e) => {
          console.error('🚨 error sending email', e);
        })) as PostalResponse;

      if (sendMailPostalResponse.status === 'success') {
        const transformedMessages = Object.entries(
          sendMailPostalResponse.data.messages
        ).map(([recipient, { id, token }]) => ({
          recipient,
          id,
          token
        }));

        const entryMetadata: ConvoEntryMetadata = {
          email: {
            to: [],
            from: [
              {
                id: +sendAsEmailIdentity.id,
                type: 'emailIdentity',
                publicId: sendAsEmailIdentity.publicId,
                email:
                  sendAsEmailIdentity.username +
                  '@' +
                  sendAsEmailIdentity.domainName
              }
            ],
            cc: [],
            messageId: sendMailPostalResponse.data.message_id,
            postalMessages: transformedMessages.map((message) => ({
              ...message,
              postalMessageId: sendMailPostalResponse.data.message_id
            }))
          }
        };
        return {
          success: true,
          metadata: entryMetadata as ConvoEntryMetadata
        };
      } else {
        console.error(
          `🚨 attempted to send convoId: ${entryId} from convoId: ${convoId}, but got the following error`,
          sendMailPostalResponse.data.message
        );
        return {
          success: false
        };
      }
    })
});
