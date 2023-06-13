import { pgTable, serial, text, integer, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name')
});

export const usersRelations = relations(users, ({ many }) => ({
  usersToGroups: many(usersToGroups)
}));

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name')
});

export const groupsRelations = relations(groups, ({ many }) => ({
  usersToGroups: many(usersToGroups)
}));

export const usersToGroups = pgTable(
  'users_to_groups',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    groupId: integer('group_id')
      .notNull()
      .references(() => groups.id)
  },
  (t) => ({
    pk: primaryKey(t.userId, t.groupId)
  })
);

export const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  group: one(groups, {
    fields: [usersToGroups.groupId],
    references: [groups.id]
  }),
  user: one(users, {
    fields: [usersToGroups.userId],
    references: [users.id]
  })
}));
