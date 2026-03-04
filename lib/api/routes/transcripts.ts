import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { transcripts, syncLog } from '../db/schema';
import { eq, isNull, and, desc, sql } from 'drizzle-orm';
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
    expectedVersion: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
});

// List all transcripts (with optional pagination)
// Excludes heavy 'text'/'fineTunedText' by default — use ?full=true to include
transcriptsRoutes.get('/', async (c) => {
    const limitParam = parseInt(c.req.query('limit') || '0', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const full = c.req.query('full') === 'true';

    if (full) {
        let fullQuery = db.select().from(transcripts)
            .where(isNull(transcripts.deletedAt))
            .orderBy(desc(transcripts.createdAt))
            .$dynamic();
        if (limitParam > 0) fullQuery = fullQuery.limit(limitParam);
        if (offset > 0) fullQuery = fullQuery.offset(offset);
        const allTranscripts = await fullQuery;
        return c.json(allTranscripts.map((t: typeof allTranscripts[number]) => {
            let tags: string[] = [];
            if (t.tags) { try { tags = JSON.parse(t.tags); } catch {} }
            return { ...t, tags };
        }));
    }

    // Default: preview only (first 200 chars of text)
    let query = db.select({
        id: transcripts.id,
        recordingId: transcripts.recordingId,
        text: sql<string>`substr(${transcripts.text}, 1, 200)`,
        provider: transcripts.provider,
        model: transcripts.model,
        tags: transcripts.tags,
        version: transcripts.version,
        createdAt: transcripts.createdAt,
        updatedAt: transcripts.updatedAt,
    }).from(transcripts).where(isNull(transcripts.deletedAt)).orderBy(desc(transcripts.createdAt)).$dynamic();

    if (limitParam > 0) query = query.limit(limitParam);
    if (offset > 0) query = query.offset(offset);

    const allTranscripts = await query;
    return c.json(allTranscripts.map((t: typeof allTranscripts[number]) => {
        let tags: string[] = [];
        if (t.tags) { try { tags = JSON.parse(t.tags); } catch {} }
        return { ...t, tags };
    }));
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

    let tags: string[] = [];
    if (transcript.tags) {
        try { tags = JSON.parse(transcript.tags); } catch { /* corrupted tags */ }
    }
    return c.json({ ...transcript, tags });
});

// Create transcript
transcriptsRoutes.post('/', async (c) => {
    const body = await c.req.json();
    const data = transcriptSchema.parse(body);

    const id = data.id || nanoid();
    const now = new Date();

    await db.transaction(async (tx: any) => {
        await tx.insert(transcripts).values({
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

        await tx.insert(syncLog).values({
            entityType: 'transcript',
            entityId: id,
            operation: 'create',
            version: 1,
            timestamp: now,
        });
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

    // Optimistic concurrency check
    if (data.expectedVersion !== undefined && existing.version !== data.expectedVersion) {
        return c.json({
            error: 'Version conflict',
            serverVersion: existing.version,
            expectedVersion: data.expectedVersion,
        }, 409);
    }

    const newVersion = (existing.version || 0) + 1;
    const now = new Date();

    await db.transaction(async (tx: any) => {
        await tx.update(transcripts)
            .set({
                text: data.text,
                fineTunedText: data.fineTunedText,
                tags: data.tags ? JSON.stringify(data.tags) : null,
                version: newVersion,
                updatedAt: now,
            })
            .where(eq(transcripts.id, id));

        await tx.insert(syncLog).values({
            entityType: 'transcript',
            entityId: id,
            operation: 'update',
            version: newVersion,
            timestamp: now,
        });
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

    await db.transaction(async (tx: any) => {
        await tx.update(transcripts)
            .set({
                deletedAt: now,
                version: newVersion,
                updatedAt: now,
            })
            .where(eq(transcripts.id, id));

        await tx.insert(syncLog).values({
            entityType: 'transcript',
            entityId: id,
            operation: 'delete',
            version: newVersion,
            timestamp: now,
        });
    });

    // Delete associated recording if it exists (outside transaction - file ops aren't transactional)
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
        }
    }

    return c.json({ success: true });
});

export default transcriptsRoutes;
