import crypto from 'crypto';
import { env } from './env';

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

type EmailMode = 'individual' | 'reply-chain';

async function sendEmail(emailData: EmailData): Promise<PostalResponse> {
  //   if (env.MAILBRIDGE_LOCAL_MODE) {
  //     console.info('Mailbridge local mode enabled, sending email to console')
  //     console.info(JSON.stringify(emailData.plain_body, null, 2))
  //     return {
  //       status: 'success',
  //       time: Date.now(),
  //       flags: {},
  //       data: {
  //         message_id: 'console',
  //         messages: {}
  //       }
  //     }
  //   }

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

const sendIndividualEmails = async (
  email: string,
  amount: number,
  interval: number,
  testIdentifier: string
) => {
  for (let i = 0; i < amount; i++) {
    const uniqueId = Date.now() + i;
    const subject = `Test Email ${i + 1} (ID: ${uniqueId}, Hash: ${testIdentifier})`;
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
        console.log(`Email ${i + 1} sent successfully:`, response.data);
      } else {
        console.error(`Error sending email ${i + 1}:`, response.data);
      }
    } catch (error) {
      console.error(`Unexpected error sending email ${i + 1}:`, error);
    }

    if (i < amount - 1) {
      console.log(`Waiting ${interval} seconds before sending next email...`);
      await sleep(interval * 1000);
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
    const uniqueId = Date.now() + i;
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
        console.log(`Email ${i + 1} sent successfully:`, response.data);
        previousMessageId = response.data.message_id;
      } else {
        console.error(`Error sending email ${i + 1}:`, response.data);
      }
    } catch (error) {
      console.error(`Unexpected error sending email ${i + 1}:`, error);
    }

    if (i < amount - 1) {
      console.log(`Waiting ${interval} seconds before sending next email...`);
      await sleep(interval * 1000);
    }
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('email='));
  const amountArg = args.find((arg) => arg.startsWith('amount='));
  const intervalArg = args.find((arg) => arg.startsWith('interval='));
  const modeArg = args.find((arg) => arg.startsWith('mode='));

  if (!emailArg || !amountArg) {
    console.error(
      'Usage: pnpm stress:email email=some@gmail.com amount=100 [interval=60] [mode=individual|reply-chain]'
    );
    process.exit(1);
  }

  const email = emailArg.split('=')[1];
  const amount = parseInt(amountArg.split('=')[1], 10);
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 60;
  const mode = (modeArg?.split('=')[1] as EmailMode) || 'individual';

  if (isNaN(amount) || amount <= 0) {
    console.error('Amount must be a positive number');
    process.exit(1);
  }

  if (isNaN(interval) || interval < 0) {
    console.error('Interval must be a non-negative number');
    process.exit(1);
  }

  if (mode !== 'individual' && mode !== 'reply-chain') {
    console.error('Mode must be either "individual" or "reply-chain"');
    process.exit(1);
  }

  const testIdentifier = crypto.randomBytes(4).toString('hex');
  console.log(`Starting email script with unique hash: ${testIdentifier}`);

  const sendFunction =
    mode === 'individual' ? sendIndividualEmails : sendReplyChain;

  sendFunction(email, amount, interval, testIdentifier)
    .then(() => {
      console.log(`Finished sending emails. Unique hash: ${testIdentifier}`);
    })
    .catch((error) => {
      console.error('An error occurred:', error);
      console.log(
        `Script terminated. Unique test identifier: ${testIdentifier}`
      );
    });
};

main();
