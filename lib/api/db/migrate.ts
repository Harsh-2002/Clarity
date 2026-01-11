import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, getSqlite } from './client';

console.log('Running migrations...');

migrate(db, { migrationsFolder: './drizzle/migrations' });

console.log('Migrations complete!');

getSqlite().close();
