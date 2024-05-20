import {
  inviteTemplate,
  inviteTemplatePlainText,
  type InviteEmailProps
} from './inviteTemplate';
import { env } from '~platform/env';

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

export async function sendInviteEmail({
  invitingOrg,
  to,
  invitedName,
  expiryDate,
  inviteUrl
}: InviteEmailProps) {
  const config = env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS;
  const sendMailPostalResponse = (await fetch(
    `${config.apiUrl}/api/v1/send/message`,
    {
      method: 'POST',
      headers: {
        'X-Server-API-Key': `${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: [to],
        cc: [],
        from: `${config.sendAsName} <${config.sendAsEmail}>`,
        sender: config.sendAsEmail,
        subject: `You have been invited to join ${invitingOrg} on Uninbox`,
        plain_body: inviteTemplatePlainText({
          expiryDate,
          invitedName,
          inviteUrl,
          invitingOrg,
          to
        }),
        html_body: inviteTemplate({
          expiryDate,
          invitedName,
          inviteUrl,
          invitingOrg,
          to
        }),
        attachments: [],
        headers: {}
      })
    }
  )
    .then((res) => res.json())
    .catch((e) => {
      console.error('🚨 error sending invite email', e);
    })) as PostalResponse;

  if (!sendMailPostalResponse) return;
  return sendMailPostalResponse;
}
