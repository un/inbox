import {
  recoveryEmailTemplate,
  recoveryEmailTemplatePlainText,
  type RecoveryEmailProps
} from './setRecoveryEmailTemplate';
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

type EmailData = {
  to: string[];
  cc: string[];
  from: string;
  sender: string;
  subject: string;
  plain_body: string;
  html_body: string;
  attachments: unknown[];
  headers: Record<string, string>;
};

async function sendEmail(emailData: EmailData): Promise<PostalResponse> {
  if (env.MAILBRIDGE_LOCAL_MODE) {
    console.info('Mailbridge local mode enabled, sending email to console');
    console.info(JSON.stringify(emailData, null, 2));
    return {
      status: 'success',
      time: Date.now(),
      flags: {},
      data: {
        message_id: 'console',
        messages: {}
      }
    };
  }

  const config = env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS;
  const sendMailPostalResponse = (await fetch(
    `${config.apiUrl}/api/v1/send/message`,
    {
      method: 'POST',
      headers: {
        'X-Server-API-Key': `${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    }
  )
    .then((res) => res.json())
    .catch((e) => {
      console.error('🚨 error sending email', e);
      return {
        status: 'parameter-error',
        time: Date.now(),
        flags: {},
        data: { message_id: 'console', messages: {} }
      };
    })) as PostalResponse;

  return sendMailPostalResponse;
}

export async function sendInviteEmail({
  invitingOrgName,
  to,
  invitedName,
  expiryDate,
  inviteUrl
}: InviteEmailProps) {
  const config = env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS;
  return await sendEmail({
    to: [to],
    cc: [],
    from: `${config.sendAsName} <${config.sendAsEmail}>`,
    sender: config.sendAsEmail,
    subject: `You have been invited to join ${invitingOrgName} on Uninbox`,
    plain_body: inviteTemplatePlainText({
      to,
      expiryDate,
      invitedName,
      inviteUrl,
      invitingOrgName
    }),
    html_body: inviteTemplate({
      to,
      expiryDate,
      invitedName,
      inviteUrl,
      invitingOrgName
    }),
    attachments: [],
    headers: {}
  });
}

export async function sendRecoveryEmailConfirmation({
  to,
  username,
  recoveryEmail,
  confirmationUrl,
  expiryDate,
  verificationCode
}: RecoveryEmailProps) {
  const config = env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS;
  return await sendEmail({
    to: [to],
    cc: [],
    from: `${config.sendAsName} <${config.sendAsEmail}>`,
    sender: config.sendAsEmail,
    subject: `Confirm your recovery email for Uninbox`,
    plain_body: recoveryEmailTemplatePlainText({
      to,
      username,
      recoveryEmail,
      confirmationUrl,
      expiryDate,
      verificationCode
    }),
    html_body: recoveryEmailTemplate({
      to,
      username,
      recoveryEmail,
      confirmationUrl,
      expiryDate,
      verificationCode
    }),
    attachments: [],
    headers: {}
  });
}
