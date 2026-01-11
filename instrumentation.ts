export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { db } = await import('./lib/api/db/client');
            const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

            console.log('📦 Running database migrations...');
            migrate(db, { migrationsFolder: './drizzle/migrations' });
            console.log('✅ Migrations completed successfully');
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }
}
