import { db } from '@uninbox/database';
import { simpleParser } from 'mailparser';
import { and, eq } from '@uninbox/database/orm';
import { convoEntries } from '@uninbox/database/schema';
import prepareMessage from '@uninbox/mailtools';
import type { postalEmailPayload } from '../../../../types';
/**
 * used for all incoming mail from Postal
 */

export default eventHandler(async (event) => {
  sendNoContent(event, 200);
  // console.log('🔥 new event');
  const [orgIdStr, mailserverId] = event.context.params.mailServer.split('/');
  const orgId = Number(orgIdStr);

  //! Verify org/mailserver

  // read and parse the body
  const body: postalEmailPayload = await readBody(event);
  if (typeof body.message !== 'string') {
    console.error('Error: body.message is undefined or not a string.');
    // Handle the error appropriately, e.g., send a response indicating the bad request
    // or log more information for debugging purposes.
    return;
  }

  const message = Buffer.from(body.message, 'base64').toString('utf-8');
  const { id: postalId, rcpt_to: mailTo, mail_from: mailFrom } = body;

  //! verify email auth (DKIM, SPF, etc.)

  // console.log('🔥', { originalMessage: message });
  let {
    inReplyTo,
    subject,
    messageId,
    date,
    html: messageBodyHtml,
    text: messageBodyPlainText
  } = await simpleParser(message);

  inReplyTo = inReplyTo ? inReplyTo.replace(/^<|>$/g, '') : '';
  subject = subject ? subject.replace(/^(RE:|FW:)\s*/i, '').trim() : '';
  messageId = messageId ? messageId.replace(/^<|>$/g, '') : '';
  date = new Date(date);

  messageBodyHtml = messageBodyHtml ? messageBodyHtml.replace(/\n/g, '') : '';

  //console.log('🔥', { inReplyTo, subject, messageId, date, messageBodyHtml });

  const preapredMessage = prepareMessage(messageBodyHtml, {
    noQuotations: true,
    cleanStyles: true
    // autolink = false,
    // enhanceLinks = false,
    // forceViewport = false,
    // noRemoteContent = false,
    // includeStyle: false,
    // remoteContentReplacements = {}
  });

  console.log('🔥', { cleanedMessage: preapredMessage.messageHtml });

  console.log('🔥', { preapredMessage });

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
