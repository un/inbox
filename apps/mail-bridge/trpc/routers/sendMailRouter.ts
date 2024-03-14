import { ZodLazy, z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  emailRoutingRules,
  emailIdentitiesAuthorizedUsers,
  postalServers,
  emailIdentitiesPersonal,
  convoEntries,
  ConvoEntryMetadata
} from '@u22n/database/schema';
import { nanoId, nanoIdLength, zodSchemas } from '@u22n/utils';
import { postalPuppet } from '@u22n/postal-puppet';
import { and, eq } from '@u22n/database/orm';
import { convert } from 'html-to-text';
import { PostalConfig } from '../../types';

export const sendMailRouter = router({
  sendNewEmail: protectedProcedure
    // to, cc, subject, bodyPlain, bodyHTML, attachmentIds, sendAsEmailIdentityPublicId
    .input(
      z.object({
        orgId: z.number(),
        convoId: z.number(),
        entryId: z.number(),
        sendAsEmailIdentityPublicId: zodSchemas.nanoId,
        toEmail: z.string().email(),
        ccEmail: z.array(z.string().email()).optional(),
        subject: z.string(),
        bodyPlainText: z.string(),
        bodyHtml: z.string(),
        attachmentIds: z.array(z.number()).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { config, db } = ctx;
      const postalConfig: PostalConfig = config.postal;

      if (postalConfig.localMode === true) {
        return {
          //! TO FIX RETURN WHEN IN LOCAL MODE
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
        attachmentIds
      } = input;

      const sendAsEmailIdentity = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, sendAsEmailIdentityPublicId),
        columns: {
          id: true,
          username: true,
          domainName: true,
          sendName: true,
          personalEmailIdentityId: true
        }
      });
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
        postalServerAPIKey = orgPostalServerResponse.apiKey;
        const postalServerConfigItem = postalConfig.servers.find(
          (server) =>
            server.url === orgPostalServerResponse.orgPostalConfigs.host
        );
        postalServerUrl = `https://${postalServerConfigItem.controlPanelSubDomain}.${postalServerConfigItem.url}/api/v1/send/message`;
      }

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

      const sendMailPostalResponse: PostalResponse = await fetch(
        postalServerUrl,
        {
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
            html_body: bodyHtml
          })
        }
      )
        .then((res) => res.json())
        .catch((e) => {
          console.error('🚨 error sending email', e);
        });

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
            to: null,
            from: [{ id: +sendAsEmailIdentity.id, type: 'emailIdentity' }],
            cc: null,
            messageId: sendMailPostalResponse.data.message_id,
            postalMessages: transformedMessages.map((message) => ({
              ...message,
              postalMessageId: sendMailPostalResponse.data.message_id
            }))
          }
        };
        return {
          success: true,
          metadata: entryMetadata
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
