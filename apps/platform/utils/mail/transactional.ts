import {
  inviteTemplate,
  inviteTemplatePlainText,
  type InviteEmailProps
} from './inviteTemplate';
import {
  recoveryEmailTemplate,
  recoveryEmailTemplatePlainText,
  type RecoveryEmailProps
} from './setRecoveryEmailTemplate';
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

// Re-usable function to route email sending to console or mailbridge
const createEmailSender = () => {
  const useConsoleLogEmailSending =
    env.DANGEROUS_DISABLE_EMAIL_SENDING === 'true';

  return async function sendEmail(emailData: any, emailFunction: Function) {
    if (useConsoleLogEmailSending) {
      // eslint-disable-next-line no-console
      console.log('Email data:', JSON.stringify(emailData, null, 2));
      return { success: true, message: 'Email logged to console' };
    } else {
      return await emailFunction(emailData);
    }
  };
};

// Create an instance of the email sender
const sendEmail = createEmailSender();

export async function sendInviteEmail({
  invitingOrgName,
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
        subject: `You have been invited to join ${invitingOrgName} on Uninbox`,
        plain_body: inviteTemplatePlainText({
          expiryDate,
          invitedName,
          inviteUrl,
          invitingOrgName: invitingOrgName,
          to
        }),
        html_body: inviteTemplate({
          expiryDate,
          invitedName,
          inviteUrl,
          invitingOrgName: invitingOrgName,
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

  return sendMailPostalResponse;
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
  const emailData = {
    to: [to],
    cc: [],
    from: `${config.sendAsName} <${config.sendAsEmail}>`,
    sender: config.sendAsEmail,
    subject: `Confirm your recovery email for Uninbox`,
    plain_body: recoveryEmailTemplatePlainText({
      to,
      username: username,
      recoveryEmail,
      confirmationUrl,
      expiryDate,
      verificationCode
    }),
    html_body: recoveryEmailTemplate({
      to,
      username: username,
      recoveryEmail,
      confirmationUrl,
      expiryDate,
      verificationCode
    }),
    attachments: [],
    headers: {}
  };

  const sendMailFunction = async (data: any) => {
    const sendMailPostalResponse = await fetch(
      `${config.apiUrl}/api/v1/send/message`,
      {
        method: 'POST',
        headers: {
          'X-Server-API-Key': `${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )
      .then((res) => res.json())
      .catch((e) => {
        console.error('🚨 error sending recovery email confirmation', e);
      });

    return sendMailPostalResponse;
  };

  return await sendEmail(emailData, sendMailFunction);
}
