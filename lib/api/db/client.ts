import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'file:./data/db/clarity.db';

// Extract file path from URL
const dbPath = databaseUrl.replace('file:', '');

let _sqlite: Database.Database | null = null;
let _db: any = null;

function getDb() {
    if (_db) return _db;

    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    if (!existsSync(dataDir)) {
        try {
            mkdirSync(dataDir, { recursive: true });
        } catch (e: any) {
            console.warn("Failed to create data directory (expected during build):", e.message);
        }
    }

    // Create SQLite connection
    try {
        _sqlite = new Database(dbPath);
        _sqlite.pragma('journal_mode = WAL');
        _db = drizzle(_sqlite, { schema });
        return _db;
    } catch (e: any) {
        // During build phase, we might not be able to open the DB
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            // Return a proxy that throws if actually called during build
            return new Proxy({}, {
                get() {
                    throw new Error(`Database accessed during build phase: ${e.message}`);
                }
            });
        }
        throw e;
    }
}

// Export a proxy for the db object
export const db = new Proxy({} as any, {
    get(target, prop) {
        const instance = getDb();
        return instance[prop];
    }
});

export const getSqlite = () => {
    getDb();
    return _sqlite!;
};
