import {
  cancel,
  group,
  intro,
  outro,
  select,
  text,
  log,
  spinner
} from '@clack/prompts';
import { nanoIdToken } from '@u22n/utils/zodSchemas';
import { env } from '../env';
import { z } from 'zod';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function sendEmail(emailData: EmailData): Promise<PostalResponse> {
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
    .catch((e: Error) => {
      log.error(`🚨 error sending email ${e.message}`);
      return {
        status: 'parameter-error',
        time: Date.now(),
        flags: {},
        data: { message_id: 'console', messages: {} }
      };
    })) as PostalResponse;

  return sendMailPostalResponse;
}

const { start, stop } = spinner();

const sendIndividualEmails = async (
  email: string,
  amount: number,
  interval: number,
  testIdentifier: string
) => {
  for (let i = 0; i < amount; i++) {
    const uniqueId = Date.now() + i;
    const subject = `Test Email ${i + 1} (ID: ${uniqueId}, testId: ${testIdentifier})`;
    const content = `This is a test email (${i + 1} of ${amount}).`;

    const emailData = {
      to: [email],
      cc: [],
      from: `${env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsName} <${env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsEmail}>`,
      sender: env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsEmail,
      subject,
      plain_body: content,
      html_body: `<p>${content}</p>`,
      attachments: [],
      headers: {}
    };

    try {
      const response = await sendEmail(emailData);

      if (response.status === 'success') {
        log.info(
          `Email ${i + 1} sent successfully: ${JSON.stringify(response.data)}`
        );
      } else {
        log.error(
          `Error sending email ${i + 1}: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      log.error(
        `Unexpected error sending email ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (i < amount - 1) {
      start(`Waiting ${interval} seconds before sending next email...`);
      await sleep(interval * 1000);
      stop(`Sending Email ${i + 1} of ${amount}`);
    }
  }
};

const sendReplyChain = async (
  email: string,
  amount: number,
  interval: number,
  testIdentifier: string
) => {
  let previousMessageId: string | undefined;

  for (let i = 0; i < amount; i++) {
    const subject =
      i === 0
        ? `Initial Email (Hash: ${testIdentifier})`
        : `Re: Initial Email (Hash: ${testIdentifier})`;
    const content = `This is ${i === 0 ? 'the initial email' : `a reply (${i} of ${amount - 1})`}.`;

    const emailData: EmailData = {
      to: [email],
      cc: [],
      from: `${env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsName} <${env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsEmail}>`,
      sender: env.MAILBRIDGE_TRANSACTIONAL_CREDENTIALS.sendAsEmail,
      subject,
      plain_body: content,
      html_body: `<p>${content}</p>`,
      attachments: [],
      headers: previousMessageId ? { 'In-Reply-To': previousMessageId } : {}
    };

    try {
      const response = await sendEmail(emailData);

      if (response.status === 'success') {
        log.info(
          `Email ${i + 1} sent successfully: ${JSON.stringify(response.data)}`
        );
        previousMessageId = response.data.message_id;
      } else {
        log.error(
          `Error sending email ${i + 1}: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      log.error(
        `Unexpected error sending email ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (i < amount - 1) {
      start(`Waiting ${interval} seconds before sending next email...`);
      await sleep(interval * 1000);
      stop(`Sending Email ${i + 1} of ${amount}`);
    }
  }
};

intro('Stress Test Email');

const params = await group(
  {
    email: () =>
      text({
        message: 'Enter the email address to send to',
        validate: (value) => {
          if (!z.string().email().safeParse(value).success) {
            return 'Email is not valid';
          }
        }
      }),
    amount: () =>
      text({
        message: 'Enter the amount of emails to send',
        validate: (value) => {
          if (!z.coerce.number().int().min(1).safeParse(value).success) {
            return 'Amount must be a positive integer';
          }
          if (Number(value) > 50) {
            return 'Amount must be less than 50';
          }
        },
        initialValue: '10'
      }),
    interval: () =>
      text({
        message: 'Enter the interval between emails in seconds',
        validate: (value) => {
          if (!z.coerce.number().int().min(1).safeParse(value).success) {
            return 'Interval must be a positive integer';
          }
          if (Number(value) > 60) {
            return 'Interval must be less than 60';
          }
        },
        initialValue: '1'
      }),
    mode: () =>
      select({
        message: 'Select the mode',
        options: [
          { value: 'individual', label: 'Individual' },
          { value: 'reply-chain', label: 'Reply Chain' }
        ],
        initialValue: 'individual'
      })
  },
  {
    onCancel: () => {
      cancel('Cancelled');
      process.exit(0);
    }
  }
);

const sendFunction =
  params.mode === 'individual' ? sendIndividualEmails : sendReplyChain;

await sendFunction(
  params.email,
  Number(params.amount),
  Number(params.interval),
  nanoIdToken(6)
);

outro('Emails sent');
