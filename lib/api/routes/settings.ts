import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

const settingsRoutes = new Hono();

const settingsSchema = z.object({
    selectedProvider: z.enum(['openai', 'groq', 'assemblyai']).nullable().optional(),
    selectedTranscriptionModel: z.string().nullable().optional(),
    selectedFinetuneModel: z.string().nullable().optional(),
    customSystemPrompt: z.string().optional(),
    autoFineTune: z.boolean().optional(),
    onboardingComplete: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
});

// Get settings
settingsRoutes.get('/', async (c) => {
    let result = await db.query.settings.findFirst({
        where: eq(settings.id, 1),
    });

    // Return defaults if not found
    if (!result) {
        result = {
            id: 1,
            selectedProvider: null,
            selectedTranscriptionModel: null,
            selectedFinetuneModel: null,
            customSystemPrompt: null,
            autoFineTune: false,
            onboardingComplete: false,
            theme: 'system',
            updatedAt: null,
        };
    }

    return c.json(result);
});

// Update settings
settingsRoutes.put('/', async (c) => {
    const body = await c.req.json();
    const data = settingsSchema.parse(body);
    const now = new Date();

    // Check if settings row exists
    const existing = await db.query.settings.findFirst({
        where: eq(settings.id, 1),
    });

    if (existing) {
        await db.update(settings)
            .set({
                ...data,
                updatedAt: now,
            })
            .where(eq(settings.id, 1));
    } else {
        await db.insert(settings).values({
            id: 1,
            ...data,
            updatedAt: now,
        });
    }

    // Get updated settings
    const updated = await db.query.settings.findFirst({
        where: eq(settings.id, 1),
    });

    return c.json(updated);
});

export default settingsRoutes;
