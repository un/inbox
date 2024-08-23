import { cancel, group, intro, outro, text } from '@clack/prompts';
import { mailProcessorQueue } from '../queue/mail-processor';
import { typeIdValidator } from '@u22n/utils/typeid';
import { testEmail } from './email-templates';
import { nanoid } from 'nanoid';
import { z } from 'zod';

intro('Mock Incoming Mail');

const params = await group(
  {
    orgId: () =>
      text({
        message: 'Enter Postal Org Id',
        initialValue: '0',
        validate: (value) => {
          if (!z.coerce.number().safeParse(value).success) {
            return 'OrgId must be a number';
          }
        }
      }),
    mailserverId: () =>
      text({
        message: 'Enter your Mailserver Id',
        initialValue: 'root',
        validate: (value) => {
          if (
            !z
              .enum(['root', 'fwd'])
              .or(typeIdValidator('postalServers'))
              .safeParse(value).success
          ) {
            return 'MailserverId must be either root, fwd or a valid postalServerId';
          }
        }
      })
  },
  {
    onCancel: () => {
      cancel('Cancelled');
      process.exit(0);
    }
  }
);

const message = await group(
  {
    rcpt_to: () =>
      text({
        message: 'Enter the recipient email address',
        validate: (value) => {
          if (!z.string().includes('@').safeParse(value).success) {
            return 'Recipient email is not valid';
          }
        }
      }),
    from: () =>
      text({
        message: 'Enter the sender email address',
        initialValue: 'mock@uninbox.local',
        validate: (value) => {
          if (!z.string().email().safeParse(value).success) {
            return 'Sender email is not valid';
          }
        }
      }),
    rawMessage: () =>
      text({
        message: 'Enter raw email in RFC822 format',
        placeholder: '(Skip to use test email)',
        initialValue: ''
      })
  },
  {
    onCancel: () => {
      cancel('Cancelled');
      process.exit(0);
    }
  }
);

const encodedEmail = Buffer.from(
  message.rawMessage ||
    testEmail({
      from: message.from,
      to: message.rcpt_to
    })
).toString('base64');

await mailProcessorQueue.add(`mock incoming mail ${nanoid(6)}`, {
  params: {
    orgId: Number(params.orgId),
    // @ts-expect-error, not important to type properly
    mailserverId: params.mailserverId
  },
  rawMessage: {
    id: Math.floor(Math.random() * 1000),
    base64: true,
    size: encodedEmail.length,
    mail_from: message.from,
    rcpt_to: message.rcpt_to,
    message: encodedEmail
  }
});

outro('Mock incoming mail added to queue');
process.exit(0);
