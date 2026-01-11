import type { Config } from 'drizzle-kit'

export default {
    schema: './lib/api/db/schema.ts',
    out: './drizzle/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'file:./data/clarity.db',
    },
} satisfies Config
