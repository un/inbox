import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  invitedBy: integer('invited_by')
});

export const usersRelations = relations(users, ({ one }) => ({
  invitee: one(users, {
    fields: [users.invitedBy],
    references: [users.id]
  })
}));
