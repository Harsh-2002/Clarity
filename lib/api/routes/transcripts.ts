import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { transcripts, syncLog } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const transcriptsRoutes = new Hono();

const transcriptSchema = z.object({
    id: z.string().optional(),
    recordingId: z.string().optional(),
    text: z.string().min(1),
    fineTunedText: z.string().optional(),
    provider: z.string(),
    model: z.string(),
    tags: z.array(z.string()).optional(),
    version: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
});

// List all transcripts
transcriptsRoutes.get('/', async (c) => {
    const allTranscripts = await db.query.transcripts.findMany({
        where: isNull(transcripts.deletedAt),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // Parse tags JSON
    return c.json(allTranscripts.map(t => ({
        ...t,
        tags: t.tags ? JSON.parse(t.tags) : [],
    })));
});

// Get single transcript
transcriptsRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const transcript = await db.query.transcripts.findFirst({
        where: and(eq(transcripts.id, id), isNull(transcripts.deletedAt)),
    });

    if (!transcript) {
        return c.json({ error: 'Transcript not found' }, 404);
    }

    return c.json({
        ...transcript,
        tags: transcript.tags ? JSON.parse(transcript.tags) : [],
    });
});

// Create transcript
transcriptsRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const data = transcriptSchema.parse(body);

    const id = data.id || nanoid();
    const now = new Date();

    await db.insert(transcripts).values({
        id,
        recordingId: data.recordingId,
        text: data.text,
        fineTunedText: data.fineTunedText,
        provider: data.provider,
        model: data.model,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        version: 1,
        createdAt: now,
        updatedAt: now,
    });

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'transcript',
        entityId: id,
        operation: 'create',
        version: 1,
        timestamp: now,
    });

    return c.json({ id, version: 1, synced: true }, 201);
});

// Update transcript
transcriptsRoutes.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = transcriptSchema.parse(body);

    const existing = await db.query.transcripts.findFirst({
        where: eq(transcripts.id, id),
    });

    if (!existing) {
        return c.json({ error: 'Transcript not found' }, 404);
    }

    const newVersion = (existing.version || 0) + 1;
    const now = new Date();

    await db.update(transcripts)
        .set({
            text: data.text,
            fineTunedText: data.fineTunedText,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            version: newVersion,
            updatedAt: now,
        })
        .where(eq(transcripts.id, id));

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'transcript',
        entityId: id,
        operation: 'update',
        version: newVersion,
        timestamp: now,
    });

    return c.json({ id, version: newVersion, synced: true });
});

// Delete transcript (soft delete)
transcriptsRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const now = new Date();

    const existing = await db.query.transcripts.findFirst({
        where: eq(transcripts.id, id),
    });

    if (!existing) {
        return c.json({ error: 'Transcript not found' }, 404);
    }

    const newVersion = (existing.version || 0) + 1;

    await db.update(transcripts)
        .set({
            deletedAt: now,
            version: newVersion,
            updatedAt: now,
        })
        .where(eq(transcripts.id, id));

    // Delete associated recording if it exists
    if (existing.recordingId) {
        try {
            const { join } = await import('path');
            const { existsSync, unlinkSync } = await import('fs');
            const UPLOAD_DIR = './data/uploads';
            const rid = existing.recordingId;

            let filePath: string;
            if (rid.length > 7 && rid[6] === '_') {
                const year = rid.substring(0, 4);
                const month = rid.substring(4, 6);
                filePath = join(UPLOAD_DIR, year, month, `${rid}.webm`);
            } else {
                filePath = join(UPLOAD_DIR, `${rid}.webm`);
            }

            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Failed to delete associated recording:', error);
            // We don't fail the whole request if file deletion fails
        }
    }

    // Log sync event
    await db.insert(syncLog).values({
        entityType: 'transcript',
        entityId: id,
        operation: 'delete',
        version: newVersion,
        timestamp: now,
    });

    return c.json({ success: true });
});

export default transcriptsRoutes;
