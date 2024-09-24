import { env } from '@/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databaseUrl = env.databaseUrl;

const databaseConnection = drizzle(postgres(databaseUrl, { ssl: 'require', max: 1 }));

const main = async () => {
  try {
    await migrate(databaseConnection, {
      migrationsFolder: './src/db/migrations',
    });
    /* eslint-disable-next-line no-console */
    console.log('Migration complete');
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.log(error);
  }
  process.exit(0);
};

main()
  .then(() => {})
  .catch(() => {});
