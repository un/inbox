import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createConnection } from 'mysql2';

const connection = createConnection({
  uri: process.env['DB_MYSQL_MIGRATION_URL']!
});
const db = drizzle(connection);

(async function runMigration() {
  await migrate(db, { migrationsFolder: 'migrations' });
  await connection.end();
})();
