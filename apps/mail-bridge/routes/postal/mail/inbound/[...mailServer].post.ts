import { db } from '@uninbox/database';
import { simpleParser } from 'mailparser';
import { authenticate } from 'mailauth';
import { spf } from 'mailauth/lib/spf';
import { and, eq } from '@uninbox/database/orm';
import { convoEntries, postalServers } from '@uninbox/database/schema';
import prepareMessage from '@uninbox/mailtools';
import type { postalEmailPayload } from '../../../../types';
/**
 * used for all incoming mail from Postal
 */

export default eventHandler(async (event) => {
  sendNoContent(event, 200);
  console.log('🔥 new event');
  const [orgIdStr, mailserverId] = event.context.params.mailServer.split('/');
  const orgId = Number(orgIdStr);

  //verify the mainserver actually exists
  const mailServer = await db.query.postalServers.findFirst({
    where: eq(postalServers.publicId, mailserverId),
    columns: {
      id: true,
      publicId: true,
      orgId: true
    }
  });
  if (!mailServer || +mailServer.orgId !== orgId) {
    return;
  }

  // read and decode the email payload
  const {
    id: payloadPostalEmailId,
    rcpt_to: payloadEmailTo,
    mail_from: payloadEmailFrom,
    message: payloadEmailB64
  }: postalEmailPayload = await readBody(event);

  if (typeof payloadEmailB64 !== 'string') {
    return;
  }

  const payloadEmail = Buffer.from(payloadEmailB64, 'base64').toString('utf-8');
  // console.log('🔥', { payloadEmail });

  // parse the email payload

  const parsedEmail = await simpleParser(payloadEmail);
  console.log('🔥', { headers: parsedEmail.headerLines });

  //! verify email auth (DKIM, SPF, etc.)
  const auth = await authenticate(payloadEmail, {
    trustReceived: true
  });
  console.log('🔥 DKIM results', { DKIM: auth.dkim.results });
  console.log('🔥 SPF results', { SPF: auth.spf });
  // console.log('🔥 DMARC results', { DMARK: auth.dmarc.status });

  // verify SPF manually
  const receivedHeader = parsedEmail.headerLines.find(
    (header) => header.key.toLowerCase() === 'received'
  );
  const receivedLine = receivedHeader.line;
  console.log('🔥', { receivedLine });

  const heloRegex = /from\s+([^\s]+)/;
  const heloMatch = heloRegex.exec(receivedLine);
  console.log('🔥', { heloMatch });

  const ipRegex = /\[([^\]]+)\]/;
  const ipMatch = ipRegex.exec(receivedLine);
  console.log('🔥', { ipMatch });

  const mtaRegex = /by\s+([^\s]+)/;
  const mtaMatch = mtaRegex.exec(receivedLine);
  console.log('🔥', { mtaMatch });

  const manualSpf = await spf({
    sender: parsedEmail.from.value[0].address,
    ip: ipMatch,
    helo: heloMatch,
    mta: mtaMatch
  });
  console.log('🔥 manual SPF', { manualSpf });

  // console.log('🔥', { originalMessage: message });

  //!
  // inReplyTo = inReplyTo ? inReplyTo.replace(/^<|>$/g, '') : '';
  // subject = subject ? subject.replace(/^(RE:|FW:)\s*/i, '').trim() : '';
  // messageId = messageId ? messageId.replace(/^<|>$/g, '') : '';
  // date = new Date(date);
  //!

  // messageBodyHtml = messageBodyHtml ? messageBodyHtml.replace(/\n/g, '') : '';

  //console.log('🔥', { inReplyTo, subject, messageId, date, messageBodyHtml });

  //!
  // const preapredMessage = prepareMessage(messageBodyHtml, {
  //   noQuotations: true,
  //   cleanStyles: true
  //   // autolink = false,
  //   // enhanceLinks = false,
  //   // forceViewport = false,
  //   // noRemoteContent = false,
  //   // includeStyle: false,
  //   // remoteContentReplacements = {}
  // });

  // console.log('🔥', { cleanedMessage: preapredMessage.messageHtml });

  // console.log('🔥', { preapredMessage });
  //!

  // // find the message in the DB
  // const existingMessage = await db.query.convoEntries.findFirst({
  //   where: and(
  //     eq(convoEntries.orgId, orgId),
  //     eq(convoEntries.emailMessageId, inReplyTo)
  //   ),
  //   columns: {
  //     id: true,
  //     convoId: true,
  //     bodyPlainText: true
  //   }
  // });
  // console.log('inReplyTo', inReplyTo);
  // console.log({ existingMessage });

  // return { status: "I'm Alive 🏝️" };
});
