import {
  emailIdentities,
  postalServers,
  type ConvoEntryMetadata,
  convos,
  convoEntries,
  type ConvoEntryMetadataEmailAddress,
  contacts,
  orgMembers,
  teams,
  type ConvoEntryMetadataMissingParticipant,
  orgs,
  convoParticipants
} from '@u22n/database/schema';
import {
  tryParseInlineAttachmentUrl,
  walkAndReplaceImages
} from '../../utils/tiptap-utils';
import { createExtensionSet } from '@u22n/tiptap/extensions';
import MailComposer from 'nodemailer/lib/mail-composer';
import { and, eq, inArray } from '@u22n/database/orm';
import { type JSONContent } from '@u22n/tiptap/react';
import { typeIdValidator } from '@u22n/utils/typeid';
import { router, protectedProcedure } from '../trpc';
import { sendEmail } from '../../smtp/sendEmail';
import { tiptapHtml } from '@u22n/tiptap';
import { z } from 'zod';

const tipTapExtensions = createExtensionSet();

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
      const localMode = config.MAILBRIDGE_LOCAL_MODE;

      if (localMode) {
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
          orgId: true,
          publicId: true
        },
        with: {
          participants: {
            columns: {
              publicId: true,
              orgMemberId: true,
              teamId: true,
              contactId: true,
              emailIdentityId: true
            },
            where: inArray(convoParticipants.role, ['assigned', 'contributor'])
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
      // we only include participants that are not in the convo as part of a team
      const orgMemberParticipants = convoResponse.participants.filter(
        (participant) => participant.orgMemberId && !participant.teamId
      );
      const teamParticipants = convoResponse.participants.filter(
        (participant) => participant.teamId
      );

      // if now external contact (a.k.a email participants) are found, we return early
      // This should not be reachable as we check on platform before calling mail-bridge, but if it is, we return success
      if (
        convoResponse.participants.length === 0 ||
        !contactConvoParticipants.length ||
        contactConvoParticipants.length === 0
      ) {
        return {
          success: true
        };
      }

      // get the convo entry to send

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
          emailMessageId: true,
          publicId: true
        },
        with: {
          author: {
            columns: {
              orgMemberId: true,
              teamId: true,
              emailIdentityId: true
            }
          },
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
              type: true,
              inline: true
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

      // remove the author from the array of orgMemberParticipants to not include them twice in the sending email
      if (convoEntryResponse.author?.orgMemberId) {
        orgMemberParticipants.splice(
          orgMemberParticipants.findIndex(
            (participant) =>
              participant.orgMemberId === convoEntryResponse.author?.orgMemberId
          ),
          1
        );
      }

      const sendAsEmailIdentity = await db.query.emailIdentities.findFirst({
        where: eq(emailIdentities.publicId, sendAsEmailIdentityPublicId),
        columns: {
          id: true,
          publicId: true,
          username: true,
          domainName: true,
          sendName: true,
          personalEmailIdentityId: true,
          externalCredentialsId: true
        },
        with: {
          externalCredentials: {
            columns: {
              host: true,
              port: true,
              username: true,
              password: true,
              encryption: true,
              authMethod: true
            }
          }
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

      //* CONVO EMAIL PARTICIPANTS SECTION
      //* Handle getting the email addresses for all participants

      const convoMetadataFromAddress: ConvoEntryMetadataEmailAddress = {
        id: Number(sendAsEmailIdentity.id),
        type: 'emailIdentity',
        publicId: sendAsEmailIdentity.publicId,
        email: `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`
      };
      const convoSenderEmailAddress = `${sendAsEmailIdentity.username}@${sendAsEmailIdentity.domainName}`;
      let convoMetadataToAddress: ConvoEntryMetadataEmailAddress | undefined;
      let convoToAddress: string | undefined;
      const convoMetadataCcAddresses: ConvoEntryMetadataEmailAddress[] = [];
      const convoCcAddresses: string[] = [];

      const missingEmailIdentitiesWarnings: ConvoEntryMetadataMissingParticipant[] =
        [];

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
            // get the orgMembers default email identity
            const orgMemberQueryResponse = await db.query.orgMembers.findFirst({
              where: eq(orgMembers.id, orgMemberParticipant.orgMemberId!),
              columns: {
                defaultEmailIdentityId: true
              }
            });

            if (!orgMemberQueryResponse?.defaultEmailIdentityId) {
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

            const emailIdentityResponse =
              await db.query.emailIdentities.findFirst({
                //! FIX THIS IS DIRTY SHEBANG USAGE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                where: eq(
                  emailIdentities.id,
                  orgMemberQueryResponse!.defaultEmailIdentityId!
                ),
                columns: {
                  id: true,
                  publicId: true,
                  username: true,
                  domainName: true,
                  sendName: true
                }
              });

            if (emailIdentityResponse) {
              if (
                orgMemberParticipant.publicId ===
                input.newConvoToParticipantPublicId
              ) {
                convoMetadataToAddress = {
                  id: Number(emailIdentityResponse.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.publicId,
                  email: `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
                };
                convoToAddress = `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`;
              } else {
                convoMetadataCcAddresses.push({
                  id: Number(emailIdentityResponse.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.publicId,
                  email: `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
                });
                convoCcAddresses.push(
                  `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
                );
              }
            }
          })
        );
      }

      // get the default email addresses for all teams
      if (teamParticipants.length) {
        await Promise.all(
          teamParticipants.map(async (teamParticipant) => {
            const teamQueryResponse = await db.query.teams.findFirst({
              where: eq(teams.id, teamParticipant.teamId!),
              columns: {
                name: true,
                defaultEmailIdentityId: true,
                publicId: true
              }
            });

            if (!teamQueryResponse?.defaultEmailIdentityId) {
              missingEmailIdentitiesWarnings.push({
                type: 'team',
                publicId: teamParticipant.publicId,
                name: teamQueryResponse?.name ?? 'unknown team'
              });
              return;
            }
            // const emailIdentityResponse =
            //   await db.query.emailIdentitiesAuthorizedSenders.findFirst({
            //     where: and(
            //       eq(
            //         emailIdentitiesAuthorizedSenders.teamId,
            //         teamParticipant.teamId!
            //       ),
            //       eq(emailIdentitiesAuthorizedSenders.default, true)
            //     ),
            //     columns: {
            //       id: true
            //     },
            //     with: {
            //       emailIdentity: {
            //         columns: {
            //           id: true,
            //           publicId: true,
            //           username: true,
            //           domainName: true
            //         }
            //       }
            //     }
            //   });

            const emailIdentityResponse =
              await db.query.emailIdentities.findFirst({
                where: eq(
                  emailIdentities.id,
                  teamQueryResponse.defaultEmailIdentityId
                ),
                columns: {
                  id: true,
                  publicId: true,
                  username: true,
                  domainName: true,
                  sendName: true
                }
              });

            if (!emailIdentityResponse) {
              const orgTeamResponse = await db.query.teams.findFirst({
                where: eq(teams.id, teamParticipant.teamId!),
                columns: {
                  publicId: true,
                  name: true
                }
              });

              if (orgTeamResponse) {
                missingEmailIdentitiesWarnings.push({
                  type: 'team',
                  publicId: orgTeamResponse.publicId,
                  name: orgTeamResponse.name
                });
                return;
              }
            }

            if (emailIdentityResponse) {
              if (
                teamParticipant.publicId === input.newConvoToParticipantPublicId
              ) {
                convoMetadataToAddress = {
                  id: Number(emailIdentityResponse.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.publicId,
                  email: `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
                };
                convoToAddress = `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`;
              } else {
                convoMetadataCcAddresses.push({
                  id: Number(emailIdentityResponse.id),
                  type: 'emailIdentity',
                  publicId: emailIdentityResponse.publicId,
                  email: `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
                });
                convoCcAddresses.push(
                  `${emailIdentityResponse.username}@${emailIdentityResponse.domainName}`
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
      const convoCcAddressesUnique = Array.from(new Set(convoCcAddresses));
      const convoCcAddressesFiltered = convoCcAddressesUnique.filter(
        (ccAddress) => {
          return (
            ccAddress !== convoToAddress &&
            ccAddress !== convoSenderEmailAddress
          );
        }
      );

      //* get sending server details
      let postalServerUrl: string;
      let postalServerAPIKey: string;

      if (sendAsEmailIdentity.personalEmailIdentityId) {
        postalServerUrl = `https://${config.MAILBRIDGE_POSTAL_SERVER_PERSONAL_CREDENTIALS.apiUrl}/api/v1/send/raw`;
        postalServerAPIKey =
          config.MAILBRIDGE_POSTAL_SERVER_PERSONAL_CREDENTIALS.apiKey;
      } else if (sendAsEmailIdentity.externalCredentials) {
        postalServerUrl = '';
        postalServerAPIKey = '';
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
        const postalServerConfigItem = config.MAILBRIDGE_POSTAL_SERVERS.find(
          (server) =>
            server.url === orgPostalServerResponse.orgPostalConfigs.host
        );
        postalServerUrl = `https://${postalServerConfigItem?.url}/api/v1/send/raw`;
      }

      //* Attachments
      const attachments = convoEntryResponse.attachments;

      type PostalAttachmentType = {
        name: string;
        content_type: string;
        data: string;
        base64: boolean;
        content_id?: string;
        inline?: boolean;
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
          `${config.STORAGE_URL}/api/attachments/mailfetch`,
          {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              Authorization: config.STORAGE_KEY
            },
            body: JSON.stringify({
              orgPublicId: input.orgPublicId,
              attachmentPublicId: input.attachmentPublicId,
              filename: input.fileName
            })
          }
        ).then((res) => res.json())) as GetUrlResponse;
        if (!downloadUrl?.url) {
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
              orgPublicId: orgQueryResponse.publicId,
              attachmentPublicId: attachment.publicId,
              fileName: attachment.fileName
            });
            postalAttachments.push({
              name: attachment.fileName,
              content_type: attachment.type,
              data: base64,
              base64: true,
              inline: attachment.inline,
              content_id: attachment.publicId
            });
          } catch (error) {
            console.error('Error getting attachment:', error);
          }
        }
      }

      // replace inline attachments with cid
      walkAndReplaceImages(convoEntryResponse.body as JSONContent, (url) => {
        const inlineAttachment = tryParseInlineAttachmentUrl(url);
        if (!inlineAttachment) return url;
        const replacementContentId = postalAttachments.find(
          (attachment) =>
            attachment.content_id === inlineAttachment.attachmentPublicId
        );
        if (!replacementContentId) return url;
        return `cid:${replacementContentId.content_id}`;
      });

      //* Prep and Send email
      const emailBodyHTML = tiptapHtml.generateHTML(
        convoEntryResponse.body as JSONContent,
        tipTapExtensions
      );
      const emailBodyPlainText = convoEntryResponse.bodyPlainText;

      const replyToEmailId =
        convoEntryResponse.replyTo?.convoMessageSource.emailMessageId ?? null;

      // remove duplicates in the CC metadata if they exist in the TO metadata or from metadata
      const convoMetadataCcAddressesFiltered = convoMetadataCcAddresses.filter(
        (ccAddress) => {
          return (
            ccAddress.email !== convoMetadataToAddress?.email &&
            ccAddress.email !== convoMetadataFromAddress.email
          );
        }
      );

      const mail = new MailComposer({
        to: convoToAddress,
        cc:
          convoCcAddressesFiltered.length > 0
            ? convoCcAddressesFiltered
            : undefined,
        from: sendAsEmailIdentity.sendName
          ? {
              name: sendAsEmailIdentity.sendName,
              address: convoSenderEmailAddress
            }
          : convoSenderEmailAddress,
        subject: convoEntryResponse.subject?.subject ?? 'No Subject',
        text: emailBodyPlainText,
        html: emailBodyHTML,
        attachments: postalAttachments.map((attachment) => ({
          content: attachment.data,
          filename: attachment.name,
          contentType: attachment.content_type,
          cid: attachment.inline ? attachment.content_id : undefined
        })),
        inReplyTo: replyToEmailId ?? undefined,
        references: replyToEmailId ? [replyToEmailId] : undefined,
        messageId: `${convoEntryResponse.publicId.substring(3)}_${convoResponse.publicId.substring(2)}@${sendAsEmailIdentity.domainName}`
      });

      const rawEmail = await mail.compile().build();

      // If there is external email credentials then the identity is external, use their smtp server instead of postal's
      if (sendAsEmailIdentity.externalCredentials) {
        const auth = sendAsEmailIdentity.externalCredentials; // it should be defined here

        const sentEmail = await sendEmail({
          auth,
          email: {
            to: [`${convoToAddress}`, ...convoCcAddressesFiltered],
            from: sendAsEmailIdentity.sendName
              ? `${sendAsEmailIdentity.sendName} <${convoSenderEmailAddress}>`
              : convoSenderEmailAddress,
            raw: rawEmail.toString('utf-8')
          }
        })
          .then((res) => ({ success: true, ...res }))
          .catch((e) => {
            console.error('🚨 error sending email as external identity', e);
            return {
              success: false,
              messageId: null
            };
          });

        if (sentEmail.success === false) {
          console.error(
            '🚨 error sending email as external identity',
            `send convoEntryId: ${entryId} from convoId: ${convoId}`
          );
          return {
            success: false
          };
        } else if (sentEmail.messageId) {
          const entryMetadata: ConvoEntryMetadata = {
            email: {
              to: [convoMetadataToAddress],
              from: [convoMetadataFromAddress],
              cc: convoMetadataCcAddressesFiltered,
              messageId: sentEmail.messageId,
              postalMessages: [] // Not sure about this one
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
            metadata: entryMetadata
          };
        } else {
          console.error(
            "🚨 error sending email as external identity, no idea what went wrong. didn't get success or fail",
            `send convoEntryId: ${entryId} from convoId: ${convoId}`
          );
          return {
            success: false
          };
        }
      }

      type PostalResponse =
        | {
            status: 'success';
            time: number;
            flags: unknown;
            data: {
              message_id: string;
              messages: Record<
                string,
                {
                  id: number;
                  token: string;
                }
              >;
            };
          }
        | {
            status: 'parameter-error';
            time: number;
            flags: unknown;
            data: {
              message: string;
            };
          };

      const sendMailPostalResponse = (await fetch(postalServerUrl, {
        method: 'POST',
        headers: {
          'X-Server-API-Key': `${postalServerAPIKey}`,
          'Content-Type': 'application/json',
          Sender: `${convoSenderEmailAddress}`
        },
        body: JSON.stringify({
          mail_from: convoSenderEmailAddress,
          rcpt_to: [`${convoToAddress}`, ...convoCcAddressesFiltered],
          data: rawEmail.toString('base64')
        })
      })
        .then((res) => res.json())
        .catch((e) => {
          console.error('🚨 error sending email', e);
        })) as PostalResponse;

      if (sendMailPostalResponse?.status === 'success') {
        const transformedMessages = Object.entries(
          sendMailPostalResponse.data.messages
        ).map(([recipient, { id, token }]) => ({
          recipient,
          id,
          token
        }));

        const entryMetadata: ConvoEntryMetadata = {
          email: {
            to: [convoMetadataToAddress],
            from: [convoMetadataFromAddress],
            cc: convoMetadataCcAddressesFiltered,
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
          metadata: entryMetadata
        };
      } else {
        console.error(
          `🚨 attempted to send convoEntryId: ${entryId} from convoId: ${convoId}, but got the following error`,
          sendMailPostalResponse
        );
        return {
          success: false
        };
      }
    })
});
