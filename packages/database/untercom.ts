import {
  mysqlTable,
  serial,
  timestamp,
  index,
  uniqueIndex,
  varchar,
  bigint
} from 'drizzle-orm/mysql-core';

import { relations, sql } from 'drizzle-orm';
import { orgs, spaces } from './schema';

export const foreignKey = (name: string) =>
  bigint(name, { unsigned: true, mode: 'number' });

export const publicWidgets = mysqlTable(
  'public_widgets',
  {
    id: serial('id').primaryKey(),
    orgId: foreignKey('org_id').notNull(),
    publicId: varchar('public_id', { length: 128 }).notNull(),
    spaceId: foreignKey('space_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    createdAt: timestamp('created_at')
      .notNull()
      // example input:
      // 2024-02-29 12:00:00
      .$defaultFn(() => new Date())
  },
  (table) => ({
    publicIdIndex: uniqueIndex('public_id_idx').on(table.publicId),
    orgIdIndex: index('org_id_idx').on(table.orgId),
    spaceIdIndex: index('space_id_idx').on(table.spaceId)
  })
);

export const publicWidgetsRelations = relations(publicWidgets, ({ one }) => ({
  org: one(orgs, {
    fields: [publicWidgets.orgId],
    references: [orgs.id]
  }),
  space: one(spaces, {
    fields: [publicWidgets.spaceId],
    references: [spaces.id]
  })
}));
