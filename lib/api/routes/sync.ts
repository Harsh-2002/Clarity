import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { notes, transcripts, syncLog } from '../db/schema';
import { gt, eq, inArray } from 'drizzle-orm';

const syncRoutes = new Hono();

// Pull changes since timestamp
syncRoutes.get('/pull', async (c) => {
    const since = parseInt(c.req.query('since') || '0', 10);
    const sinceDate = new Date(since);

    // Get all sync log entries since the timestamp
    const logEntries = await db.query.syncLog.findMany({
        where: gt(syncLog.timestamp, sinceDate),
        orderBy: (l, { asc }) => [asc(l.timestamp)],
    });

    // Group by entity type and fetch data
    const changes: Array<{
        entityType: string;
        entityId: string;
        operation: string;
        version: number;
        data: unknown;
        timestamp: number;
    }> = [];

    for (const entry of logEntries) {
        let data = null;

        if (entry.operation !== 'delete') {
            if (entry.entityType === 'note') {
                data = await db.query.notes.findFirst({
                    where: eq(notes.id, entry.entityId),
                });
            } else if (entry.entityType === 'transcript') {
                data = await db.query.transcripts.findFirst({
                    where: eq(transcripts.id, entry.entityId),
                });
            }
        }

        changes.push({
            entityType: entry.entityType,
            entityId: entry.entityId,
            operation: entry.operation,
            version: entry.version,
            data,
            timestamp: entry.timestamp.getTime(),
        });
    }

    return c.json({
        changes,
        serverTime: Date.now(),
    });
});

// Push changes from client
const pushSchema = z.object({
    changes: z.array(z.object({
        entityType: z.enum(['note', 'transcript']),
        entityId: z.string(),
        operation: z.enum(['create', 'update', 'delete']),
        expectedVersion: z.number().optional(),
        data: z.any(),
    })),
});

syncRoutes.post('/push', async (c) => {
    const body = await c.req.json();
    const { changes } = pushSchema.parse(body);

    const results: Array<{ entityId: string; status: string; version?: number }> = [];
    const conflicts: Array<{ entityId: string; serverVersion: number; serverData: unknown }> = [];

    for (const change of changes) {
        const now = new Date();

        if (change.entityType === 'note') {
            if (change.operation === 'create') {
                await db.insert(notes).values({
                    id: change.entityId,
                    title: change.data.title,
                    content: change.data.content,
                    version: 1,
                    createdAt: now,
                    updatedAt: now,
                }).onConflictDoNothing();

                await db.insert(syncLog).values({
                    entityType: 'note',
                    entityId: change.entityId,
                    operation: 'create',
                    version: 1,
                    timestamp: now,
                });

                results.push({ entityId: change.entityId, status: 'ok', version: 1 });
            } else if (change.operation === 'update') {
                const existing = await db.query.notes.findFirst({
                    where: eq(notes.id, change.entityId),
                });

                if (!existing) {
                    results.push({ entityId: change.entityId, status: 'not_found' });
                    continue;
                }

                // Check for conflicts
                if (change.expectedVersion !== undefined && existing.version !== change.expectedVersion) {
                    conflicts.push({
                        entityId: change.entityId,
                        serverVersion: existing.version || 0,
                        serverData: existing,
                    });
                    continue;
                }

                const newVersion = (existing.version || 0) + 1;

                await db.update(notes)
                    .set({
                        title: change.data.title,
                        content: change.data.content,
                        version: newVersion,
                        updatedAt: now,
                    })
                    .where(eq(notes.id, change.entityId));

                await db.insert(syncLog).values({
                    entityType: 'note',
                    entityId: change.entityId,
                    operation: 'update',
                    version: newVersion,
                    timestamp: now,
                });

                results.push({ entityId: change.entityId, status: 'ok', version: newVersion });
            } else if (change.operation === 'delete') {
                const existing = await db.query.notes.findFirst({
                    where: eq(notes.id, change.entityId),
                });

                if (existing) {
                    const newVersion = (existing.version || 0) + 1;

                    await db.update(notes)
                        .set({
                            deletedAt: now,
                            version: newVersion,
                            updatedAt: now,
                        })
                        .where(eq(notes.id, change.entityId));

                    await db.insert(syncLog).values({
                        entityType: 'note',
                        entityId: change.entityId,
                        operation: 'delete',
                        version: newVersion,
                        timestamp: now,
                    });
                }

                results.push({ entityId: change.entityId, status: 'ok' });
            }
        }
        // Similar handling for transcripts can be added
    }

    return c.json({ results, conflicts });
});

export default syncRoutes;
