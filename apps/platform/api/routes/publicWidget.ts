import {
  publicWidgets,
  convos,
  convoEntries,
  convoParticipants
} from '@u22n/database/schema';
import { typeIdGenerator } from '@u22n/utils/typeid';
import { eq } from '@u22n/database/orm';
import { db } from '@u22n/database';
import { Hono } from 'hono';

const publicWidgetRouter = new Hono();

publicWidgetRouter.post('/message/:publicId', async (c) => {
  const publicId = c.req.param('publicId');
  const { message, name, email } = await c.req.json();

  // Find the public widget
  const widget = await db.query.publicWidgets.findFirst({
    where: eq(publicWidgets.publicId, publicId),
    with: {
      space: true,
      org: true
    }
  });

  if (!widget) {
    return c.json({ error: 'Widget not found' }, 404);
  }

  // Create a new conversation
  const convoId = await db
    .insert(convos)
    .values({
      orgId: widget.orgId,
      publicId: typeIdGenerator('convos'),
      spaceId: widget.spaceId,
      subject: 'New message from public widget',
      lastUpdatedAt: new Date()
    })
    .execute();

  // Create a new participant for the sender
  const participantId = await db
    .insert(convoParticipants)
    .values({
      orgId: widget.orgId,
      convoId: Number(convoId.insertId),
      publicId: typeIdGenerator('convoParticipants'),
      type: 'contact',
      name: name,
      email: email
    })
    .execute();

  // Create the first message in the conversation
  await db
    .insert(convoEntries)
    .values({
      orgId: widget.orgId,
      publicId: typeIdGenerator('convoEntries'),
      type: 'message',
      convoId: Number(convoId.insertId),
      author: Number(participantId.insertId),
      body: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: message }] }
        ]
      }),
      bodyPlainText: message,
      visibility: 'all_participants'
    })
    .execute();

  return c.json({ success: true });
});

export default publicWidgetRouter;
