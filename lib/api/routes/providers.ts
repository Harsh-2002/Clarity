import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { providers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../lib/encryption';

const providersRoutes = new Hono();

const providerSchema = z.object({
    id: z.enum(['openai', 'groq', 'assemblyai']),
    name: z.string(),
    apiKey: z.string().min(1),
    models: z.object({
        transcription: z.string(),
        fineTuning: z.string(),
    }),
    limits: z.object({
        maxFileSize: z.number(),
        supportedFormats: z.array(z.string()),
    }),
});

// List all providers (API keys are decrypted)
providersRoutes.get('/', async (c) => {
    const allProviders = await db.query.providers.findMany();

    return c.json(allProviders.map(p => ({
        id: p.id,
        name: p.name,
        hasApiKey: !!p.encryptedApiKey,
        models: JSON.parse(p.models),
        limits: JSON.parse(p.limits),
        updatedAt: p.updatedAt,
    })));
});

// Get single provider (includes decrypted API key)
providersRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const provider = await db.query.providers.findFirst({
        where: eq(providers.id, id),
    });

    if (!provider) {
        return c.json({ error: 'Provider not found' }, 404);
    }

    // Decrypt API key - NO, DO NOT RETURN IT.
    // Security: We never return the decrypted key to the client.
    // The client only needs to know if it exists.
    const hasApiKey = !!provider.encryptedApiKey;

    return c.json({
        id: provider.id,
        name: provider.name,
        hasApiKey,
        // apiKey: "", // Explicitly empty
        models: JSON.parse(provider.models),
        limits: JSON.parse(provider.limits),
        updatedAt: provider.updatedAt,
    });
});

// Create or update provider
providersRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = providerSchema.parse({ ...body, id });
    const now = new Date();

    // Encrypt API key
    const encryptedApiKey = encrypt(data.apiKey);

    const existing = await db.query.providers.findFirst({
        where: eq(providers.id, id),
    });

    if (existing) {
        await db.update(providers)
            .set({
                name: data.name,
                encryptedApiKey,
                models: JSON.stringify(data.models),
                limits: JSON.stringify(data.limits),
                updatedAt: now,
            })
            .where(eq(providers.id, id));
    } else {
        await db.insert(providers).values({
            id: data.id,
            name: data.name,
            encryptedApiKey,
            models: JSON.stringify(data.models),
            limits: JSON.stringify(data.limits),
            updatedAt: now,
        });
    }

    return c.json({ id, success: true });
});

// Delete provider
providersRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');

    await db.delete(providers).where(eq(providers.id, id));

    return c.json({ success: true });
});

export default providersRoutes;
