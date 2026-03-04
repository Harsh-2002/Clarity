import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import {
    notes, transcripts, tasks, kanbanColumns, kanbanCards,
    canvases, bookmarks, journalEntries, settings, syncLog
} from '../db/schema';
import { gt, eq, inArray, isNull } from 'drizzle-orm';
import { dispatchPush } from './sync-handlers';
import { writeSyncLog } from '../db/sync-helpers';

const syncRoutes = new Hono();

// Entity type to table mapping for data fetching
const entityTableMap: Record<string, any> = {
    note: notes,
    transcript: transcripts,
    task: tasks,
    kanban_column: kanbanColumns,
    kanban_card: kanbanCards,
    canvas: canvases,
    bookmark: bookmarks,
    journal_entry: journalEntries,
};

async function fetchEntityData(entityType: string, entityIds: string[]): Promise<Map<string, any>> {
    const table = entityTableMap[entityType];
    if (!table) return new Map();

    const rows = await db.select().from(table).where(inArray(table.id, entityIds));
    const map = new Map<string, any>();
    for (const row of rows) {
        map.set(row.id, row);
    }
    return map;
}

// GET /sync/full — initial sync, returns all data from all syncable entity types
syncRoutes.get('/full', async (c) => {
    const [
        allNotes, allTranscripts, allTasks, allColumns, allCards,
        allCanvases, allBookmarks, allJournalEntries, allSettings
    ] = await Promise.all([
        db.select().from(notes).where(isNull(notes.deletedAt)),
        db.select().from(transcripts).where(isNull(transcripts.deletedAt)),
        db.select().from(tasks).where(isNull(tasks.deletedAt)),
        db.select().from(kanbanColumns).where(isNull(kanbanColumns.deletedAt)),
        db.select().from(kanbanCards).where(isNull(kanbanCards.deletedAt)),
        db.select().from(canvases).where(isNull(canvases.deletedAt)),
        db.select().from(bookmarks).where(isNull(bookmarks.deletedAt)),
        db.select().from(journalEntries).where(isNull(journalEntries.deletedAt)),
        db.select().from(settings),
    ]);

    return c.json({
        notes: allNotes,
        transcripts: allTranscripts,
        tasks: allTasks,
        kanbanColumns: allColumns,
        kanbanCards: allCards,
        canvases: allCanvases,
        bookmarks: allBookmarks,
        journalEntries: allJournalEntries,
        settings: allSettings.length > 0 ? allSettings[0] : null,
        serverTime: Date.now(),
    });
});

// GET /sync/pull — pull changes since timestamp with pagination
syncRoutes.get('/pull', async (c) => {
    const since = parseInt(c.req.query('since') || '0', 10);
    const limit = Math.min(parseInt(c.req.query('limit') || '500', 10), 1000);
    const sinceDate = new Date(since);

    // Get sync log entries since timestamp
    const logEntries = await db.select().from(syncLog)
        .where(gt(syncLog.timestamp, sinceDate))
        .orderBy(syncLog.timestamp)
        .limit(limit + 1);

    const hasMore = logEntries.length > limit;
    const entries = hasMore ? logEntries.slice(0, limit) : logEntries;

    // Group by entity type for batch fetching
    const entityGroups = new Map<string, Set<string>>();
    for (const entry of entries) {
        if (entry.operation !== 'delete') {
            const group = entityGroups.get(entry.entityType) || new Set();
            group.add(entry.entityId);
            entityGroups.set(entry.entityType, group);
        }
    }

    // Batch fetch all entity data
    const entityDataMaps = new Map<string, Map<string, any>>();
    await Promise.all(
        Array.from(entityGroups.entries()).map(async ([entityType, ids]) => {
            // Settings are special (single row, id=1)
            if (entityType === 'settings') {
                const s = await db.select().from(settings);
                const map = new Map<string, any>();
                if (s.length > 0) map.set('1', s[0]);
                entityDataMaps.set(entityType, map);
            } else {
                const map = await fetchEntityData(entityType, Array.from(ids));
                entityDataMaps.set(entityType, map);
            }
        })
    );

    // Build changes array
    const changes = entries.map((entry: any) => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        operation: entry.operation,
        version: entry.version,
        data: entry.operation !== 'delete'
            ? entityDataMaps.get(entry.entityType)?.get(entry.entityId) || null
            : null,
        timestamp: entry.timestamp.getTime(),
    }));

    return c.json({
        changes,
        hasMore,
        serverTime: Date.now(),
    });
});

// Push changes from client
const pushSchema = z.object({
    changes: z.array(z.object({
        entityType: z.enum([
            'note', 'transcript', 'task', 'kanban_column', 'kanban_card',
            'canvas', 'bookmark', 'journal_entry', 'settings'
        ]),
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
        // Handle note and transcript with original inline logic for backwards compat
        if (change.entityType === 'note') {
            const now = new Date();
            if (change.operation === 'create') {
                await db.insert(notes).values({
                    id: change.entityId,
                    title: change.data.title,
                    content: change.data.content,
                    version: 1,
                    createdAt: now,
                    updatedAt: now,
                }).onConflictDoNothing();

                await writeSyncLog('note', change.entityId, 'create', 1);
                results.push({ entityId: change.entityId, status: 'ok', version: 1 });
            } else if (change.operation === 'update') {
                const existing = await db.query.notes.findFirst({
                    where: eq(notes.id, change.entityId),
                });

                if (!existing) {
                    results.push({ entityId: change.entityId, status: 'not_found' });
                    continue;
                }

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

                await writeSyncLog('note', change.entityId, 'update', newVersion);
                results.push({ entityId: change.entityId, status: 'ok', version: newVersion });
            } else if (change.operation === 'delete') {
                const existing = await db.query.notes.findFirst({
                    where: eq(notes.id, change.entityId),
                });

                if (existing) {
                    const newVersion = (existing.version || 0) + 1;
                    await db.update(notes)
                        .set({ deletedAt: now, version: newVersion, updatedAt: now })
                        .where(eq(notes.id, change.entityId));

                    await writeSyncLog('note', change.entityId, 'delete', newVersion);
                }
                results.push({ entityId: change.entityId, status: 'ok' });
            }
            continue;
        }

        if (change.entityType === 'transcript') {
            const now = new Date();
            if (change.operation === 'create') {
                await db.insert(transcripts).values({
                    id: change.entityId,
                    text: change.data.text,
                    provider: change.data.provider,
                    model: change.data.model,
                    fineTunedText: change.data.fineTunedText || null,
                    tags: change.data.tags ? JSON.stringify(change.data.tags) : null,
                    version: 1,
                    createdAt: now,
                    updatedAt: now,
                }).onConflictDoNothing();

                await writeSyncLog('transcript', change.entityId, 'create', 1);
                results.push({ entityId: change.entityId, status: 'ok', version: 1 });
            } else if (change.operation === 'update') {
                const existing = await db.query.transcripts.findFirst({
                    where: eq(transcripts.id, change.entityId),
                });

                if (!existing) {
                    results.push({ entityId: change.entityId, status: 'not_found' });
                    continue;
                }

                if (change.expectedVersion !== undefined && existing.version !== change.expectedVersion) {
                    conflicts.push({
                        entityId: change.entityId,
                        serverVersion: existing.version || 0,
                        serverData: existing,
                    });
                    continue;
                }

                const newVersion = (existing.version || 0) + 1;
                await db.update(transcripts)
                    .set({
                        text: change.data.text ?? existing.text,
                        fineTunedText: change.data.fineTunedText ?? existing.fineTunedText,
                        tags: change.data.tags ? JSON.stringify(change.data.tags) : existing.tags,
                        version: newVersion,
                        updatedAt: now,
                    })
                    .where(eq(transcripts.id, change.entityId));

                await writeSyncLog('transcript', change.entityId, 'update', newVersion);
                results.push({ entityId: change.entityId, status: 'ok', version: newVersion });
            } else if (change.operation === 'delete') {
                const existing = await db.query.transcripts.findFirst({
                    where: eq(transcripts.id, change.entityId),
                });

                if (existing) {
                    const newVersion = (existing.version || 0) + 1;
                    await db.update(transcripts)
                        .set({ deletedAt: now, version: newVersion, updatedAt: now })
                        .where(eq(transcripts.id, change.entityId));

                    await writeSyncLog('transcript', change.entityId, 'delete', newVersion);
                }
                results.push({ entityId: change.entityId, status: 'ok' });
            }
            continue;
        }

        // All other entity types use the dispatcher
        const { result, conflict } = await dispatchPush(change);
        if (result) results.push(result);
        if (conflict) conflicts.push(conflict);
    }

    return c.json({ results, conflicts });
});

export default syncRoutes;
