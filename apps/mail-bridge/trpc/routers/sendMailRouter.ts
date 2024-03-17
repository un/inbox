import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  postalServers,
  type ConvoEntryMetadata
} from '@u22n/database/schema';
import { typeIdValidator } from '@u22n/utils';
import { and, eq } from '@u22n/database/orm';
import type { PostalConfig } from '../../types';
import { useRuntimeConfig } from '#imports';

export const sendMailRouter = router({
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
