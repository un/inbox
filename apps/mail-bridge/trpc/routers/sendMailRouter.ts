import { ZodLazy, z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  emailIdentities,
  emailRoutingRules,
  emailIdentitiesAuthorizedUsers,
  postalServers,
  personalEmailIdentities,
  convoEntries,
  ConvoEntryMetadata
} from '@uninbox/database/schema';
import { nanoId, nanoIdLength, nanoIdSchema } from '@uninbox/utils';
import { postalPuppet } from '@uninbox/postal-puppet';
import { and, eq } from '@uninbox/database/orm';
import { convert } from 'html-to-text';

export const sendMailRouter = router({
  sendNewEmail: protectedProcedure
    // to, cc, subject, bodyPlain, bodyHTML, attachmentIds, sendAsEmailIdentityPublicId
    .input(
      z.object({
        orgId: z.number(),
        convoId: z.number(),
        entryId: z.number(),
        sendAsEmailIdentityPublicId: nanoIdSchema,
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
      const localMode = config.localMode;
      if (localMode) {
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
          isPersonal: true
        }
      });
      const sendEmailAddress = `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`;
      const sendName = `${sendAsEmailIdentity.sendName} <${sendEmailAddress}>`;
      let postalServerAPIKey: String;

      if (sendAsEmailIdentity.isPersonal) {
        const personalEmailIdentityResponse =
          await db.query.personalEmailIdentities.findFirst({
            where: eq(
              personalEmailIdentities.emailIdentityId,
              sendAsEmailIdentity.id
            ),
            columns: {},
            with: {
              postalServer: {
                columns: {
                  apiKey: true
                }
              }
            }
          });
        postalServerAPIKey = personalEmailIdentityResponse.postalServer.apiKey;
      } else {
        const orgPostalServerResponse = await db.query.postalServers.findFirst({
          where: and(
            eq(postalServers.orgId, orgId),
            eq(postalServers.type, 'email')
          ),
          columns: {
            apiKey: true
          }
        });
        postalServerAPIKey = orgPostalServerResponse.apiKey;
      }

      const postalConfigResponse = await db.query.orgPostalConfigs.findFirst({
        where: eq(postalServers.orgId, orgId),
        columns: {
          host: true
        }
      });

      const postalServerHost = `https://cp.${postalConfigResponse.host}/api/v1/send/message`;

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
        postalServerHost,
        {
          method: 'POST',
          headers: {
            'X-Server-API-Key': `${postalServerAPIKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: [`${toEmail}`],
            ...(ccEmail.length > 0 ? { cc: ccEmail } : {}),
            from: sendName,
            sender: sendEmailAddress,
            subject: subject,
            plain_body: bodyPlainText,
            html_body: bodyHtml
          })
        }
      ).then((res) => res.json());

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
            postalMessageId: sendMailPostalResponse.data.message_id,
            postalMessages: transformedMessages
          }
        };

        await db
          .update(convoEntries)
          .set({
            metadata: entryMetadata
          })
          .where(eq(convoEntries.id, entryId));
      } else {
        console.log(
          `🚨 attempted to send convoId: ${entryId} from convoId: ${convoId}, but got the following error`,
          sendMailPostalResponse.data.message
        );
        return {
          success: false
        };
      }

      return {
        success: true
      };
    })
});
