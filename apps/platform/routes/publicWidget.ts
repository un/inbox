import {
  publicWidgets,
  convos,
  convoEntries,
  convoParticipants,
  contacts,
  convoToSpaces
} from '@u22n/database/schema';
import { createExtensionSet } from '@u22n/tiptap/extensions';
import { tiptapCore, tiptapHtml } from '@u22n/tiptap';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { zValidator } from '@u22n/hono/helpers';
import { createHonoApp } from '@u22n/hono';
import type { Ctx } from '~platform/ctx';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { cors } from 'hono/cors';
import { z } from 'zod';

export const publicWidgetApi = createHonoApp<Ctx>();

// Configure CORS with specific options
publicWidgetApi.use(
  '*',
  cors({
    origin: '*', // Allow all origins, or specify allowed origins
    allowMethods: ['POST', 'GET', 'OPTIONS'], // Specify allowed methods
    allowHeaders: ['Content-Type', 'Origin'], // Specify allowed headers
    exposeHeaders: ['Content-Length'],
    maxAge: 600
    // credentials: true, // Allow credentials
  })
);

const tipTapExtensions = createExtensionSet();

publicWidgetApi.post(
  '/message/:publicId',
  zValidator(
    'json',
    z.object({
      message: z.string(),
      name: z.string(),
      email: z.string().email()
    })
  ),
  async (c) => {
    console.log('Received request:', {
      publicId: c.req.param('publicId'),
      body: c.req.valid('json')
    });

    const publicId = c.req.param('publicId');
    const { message, name, email } = c.req.valid('json');

    // Find the public widget
    const widget = await db.query.publicWidgets.findFirst({
      where: eq(publicWidgets.publicId, publicId),
      columns: {
        id: true,
        orgId: true,
        spaceId: true
      }
    });

    console.log('Found widget:', widget);

    if (!widget) {
      console.log('Widget not found');
      return c.json({ error: 'Widget not found' }, 404);
    }

    // Check if the contact already exists
    let contact = await db.query.contacts.findFirst({
      where: eq(contacts.emailUsername, email.split('@')[0] ?? ''),
      columns: {
        id: true
      }
    });

    console.log('Existing contact:', contact);

    if (!contact) {
      console.log('Creating new contact');
      // Create a new contact if it doesn't exist
      const newContact = await db
        .insert(contacts)
        .values({
          publicId: typeIdGenerator('contacts'),
          orgId: widget.orgId,
          reputationId: 1,
          emailUsername: email.split('@')[0],
          emailDomain: email.split('@')[1],
          email,
          name,
          type: 'person',
          createdAt: new Date()
        })
        .execute();
      contact = { id: Number(newContact.insertId) };
      console.log('New contact created:', contact);
    }

    // Create a new conversation
    const convoId = await db
      .insert(convos)
      .values({
        orgId: widget.orgId,
        publicId: typeIdGenerator('convos'),
        lastUpdatedAt: new Date()
      })
      .execute();

    console.log('New conversation created:', convoId);

    // Assign the conversation to a space
    // You'll need to determine which space(s) to assign the conversation to
    // For this example, we'll assume there's a default space for widget conversations
    const defaultSpaceId = widget.spaceId;

    if (defaultSpaceId) {
      await db
        .insert(convoToSpaces)
        .values({
          orgId: widget.orgId,
          convoId: Number(convoId.insertId),
          spaceId: defaultSpaceId,
          publicId: typeIdGenerator('convoToSpaces')
        })
        .execute();

      console.log('Conversation assigned to space:', defaultSpaceId);
    } else {
      console.log('No default space found for widget conversations');
    }

    // Create a new participant for the sender
    const participantId = await db
      .insert(convoParticipants)
      .values({
        orgId: widget.orgId,
        convoId: Number(convoId.insertId),
        publicId: typeIdGenerator('convoParticipants'),
        contactId: contact.id,
        role: 'contributor'
      })
      .execute();

    console.log('New participant created:', participantId);

    // Create the first message in the conversation
    const messageEntry = await db
      .insert(convoEntries)
      .values({
        orgId: widget.orgId,
        publicId: typeIdGenerator('convoEntries'),
        type: 'message',
        convoId: Number(convoId.insertId),
        author: Number(participantId.insertId),
        body: tiptapHtml.generateJSON(message, tipTapExtensions),
        bodyPlainText: tiptapCore.generateText(
          tiptapHtml.generateJSON(message, tipTapExtensions),
          tipTapExtensions
        ),
        visibility: 'all_participants',
        metadata: {
          widget: {
            publicId: publicId
          }
        }
      })
      .execute();

    console.log('New message entry created:', messageEntry);

    console.log('Operation completed successfully');
    return c.json({ success: true });
  }
);
