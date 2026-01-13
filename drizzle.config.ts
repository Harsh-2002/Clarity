import type { Config } from 'drizzle-kit'

export default {
    schema: './lib/api/db/schema.ts',
    out: './drizzle/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DATABASE_PATH && process.env.DATABASE_PATH.startsWith('file:')
            ? process.env.DATABASE_PATH
            : process.env.DATABASE_PATH
                ? `file:${process.env.DATABASE_PATH}`
                : 'file:./data/clarity.db',
    },
} satisfies Config
