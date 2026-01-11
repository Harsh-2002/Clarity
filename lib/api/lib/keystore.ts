// Singleton to manage system secrets loaded from DB
import { db } from '../db/client';
import { systemConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

interface SystemSecrets {
    jwtSecret: string;
    encryptionKey: string;
}

let _secrets: SystemSecrets | null = null;

export const keystore = {
    // Initialize or retrieve secrets
    async init(): Promise<SystemSecrets> {
        if (_secrets) return _secrets;

        // Try load from DB
        let config = await db.query.systemConfig.findFirst();

        // Fallback for first run/legacy env vars (before setup is complete)
        // This prevents crash before setup
        if (!config) {
            // If strictly enforced, we might want to return null and force setup
            // But to keep some logic working (like health checks), we might need temps.
            // However, real logic relies on consistent keys.
            // We'll rely on env vars if db is empty (Backward Compat during migration)
            const envJwt = process.env.JWT_SECRET;
            const envKey = process.env.ENCRYPTION_KEY;

            if (envJwt && envKey) {
                return { jwtSecret: envJwt, encryptionKey: envKey };
            }

            // If really nothing (fresh install), return empty triggers setup mode
            throw new Error("System not initialized. Please run setup.");
        }

        _secrets = {
            jwtSecret: config.jwtSecret,
            encryptionKey: config.encryptionKey,
        };
        return _secrets;
    },

    getJwtSecret(): string {
        if (!_secrets) {
            // Fallback to env if available (legacy support)
            if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
            throw new Error("Keystore not initialized. Call init() first.");
        }
        return _secrets.jwtSecret;
    },

    getEncryptionKey(): Buffer {
        if (!_secrets) {
            if (process.env.ENCRYPTION_KEY) return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
            throw new Error("Keystore not initialized. Call init() first.");
        }
        return Buffer.from(_secrets.encryptionKey, 'hex');
    },

    // Called during Setup Phase
    async generateAndSave(): Promise<void> {
        const jwtSecret = randomBytes(32).toString('hex');
        const encryptionKey = randomBytes(32).toString('hex');
        const now = new Date();

        await db.insert(systemConfig).values({
            jwtSecret,
            encryptionKey,
            setupComplete: true,
            updatedAt: now,
        });

        // Update memory
        _secrets = { jwtSecret, encryptionKey };
    }
};
