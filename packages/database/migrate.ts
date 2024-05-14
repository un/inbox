import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createConnection } from 'mysql2/promise';
import { env } from './env';

const connection = await createConnection({
  uri: env.DB_MYSQL_MIGRATION_URL
});
const db = drizzle(connection);

await migrate(db, { migrationsFolder: 'migrations' });
await connection.end();
