import { pgTable, serial, text, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name')
});

export const usersRelations = relations(users, ({ one }) => ({
  profileInfo: one(profileInfo, {
    fields: [users.id],
    references: [profileInfo.userId]
  })
}));

export const profileInfo = pgTable('profile_info', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  metadata: jsonb('metadata')
});
