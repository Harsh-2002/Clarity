import { db } from '../db/client';
import {
    tasks, kanbanColumns, kanbanCards, canvases,
    bookmarks, journalEntries, settings, syncLog
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { writeSyncLog } from '../db/sync-helpers';

interface PushChange {
    entityType: string;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    expectedVersion?: number;
    data?: any;
}

interface PushResult {
    entityId: string;
    status: string;
    version?: number;
}

interface PushConflict {
    entityId: string;
    serverVersion: number;
    serverData: unknown;
}

async function handleVersionedPush(
    change: PushChange,
    table: any,
    getValues: (data: any, now: Date) => Record<string, any>,
    getUpdateValues: (data: any, existing: any, now: Date) => Record<string, any>,
): Promise<{ result?: PushResult; conflict?: PushConflict }> {
    const now = new Date();

    if (change.operation === 'create') {
        await db.insert(table).values({
            ...getValues(change.data, now),
            id: change.entityId,
            version: 1,
        }).onConflictDoNothing();

        await writeSyncLog(change.entityType, change.entityId, 'create', 1);
        return { result: { entityId: change.entityId, status: 'ok', version: 1 } };
    }

    if (change.operation === 'update') {
        const existing = await db.select().from(table).where(eq(table.id, change.entityId)).limit(1);
        if (!existing.length) {
            return { result: { entityId: change.entityId, status: 'not_found' } };
        }

        const row = existing[0];
        if (change.expectedVersion !== undefined && row.version !== change.expectedVersion) {
            return {
                conflict: {
                    entityId: change.entityId,
                    serverVersion: row.version || 0,
                    serverData: row,
                }
            };
        }

        const newVersion = (row.version || 0) + 1;
        await db.update(table)
            .set({
                ...getUpdateValues(change.data, row, now),
                version: newVersion,
            })
            .where(eq(table.id, change.entityId));

        await writeSyncLog(change.entityType, change.entityId, 'update', newVersion);
        return { result: { entityId: change.entityId, status: 'ok', version: newVersion } };
    }

    if (change.operation === 'delete') {
        const existing = await db.select().from(table).where(eq(table.id, change.entityId)).limit(1);
        if (existing.length) {
            const newVersion = (existing[0].version || 0) + 1;
            await db.update(table)
                .set({ deletedAt: now, version: newVersion, updatedAt: now })
                .where(eq(table.id, change.entityId));

            await writeSyncLog(change.entityType, change.entityId, 'delete', newVersion);
        }
        return { result: { entityId: change.entityId, status: 'ok' } };
    }

    return { result: { entityId: change.entityId, status: 'unknown_operation' } };
}

export async function handleTaskPush(change: PushChange) {
    return handleVersionedPush(
        change,
        tasks,
        (data, now) => ({
            text: data.text,
            completed: data.completed ?? false,
            priority: data.priority || 'medium',
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            position: data.position ?? 0,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            createdAt: now,
            updatedAt: now,
        }),
        (data, existing, now) => ({
            ...(data.text !== undefined && { text: data.text }),
            ...(data.completed !== undefined && { completed: data.completed }),
            ...(data.priority !== undefined && { priority: data.priority }),
            ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
            ...(data.position !== undefined && { position: data.position }),
            ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
            updatedAt: now,
        }),
    );
}

export async function handleKanbanColumnPush(change: PushChange) {
    return handleVersionedPush(
        change,
        kanbanColumns,
        (data, now) => ({
            title: data.title,
            position: data.position ?? 0,
            updatedAt: now,
        }),
        (data, _existing, now) => ({
            ...(data.title !== undefined && { title: data.title }),
            ...(data.position !== undefined && { position: data.position }),
            updatedAt: now,
        }),
    );
}

export async function handleKanbanCardPush(change: PushChange) {
    return handleVersionedPush(
        change,
        kanbanCards,
        (data, now) => ({
            columnId: data.columnId,
            title: data.title,
            description: data.description || null,
            position: data.position ?? 0,
            updatedAt: now,
        }),
        (data, _existing, now) => ({
            ...(data.columnId !== undefined && { columnId: data.columnId }),
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.position !== undefined && { position: data.position }),
            updatedAt: now,
        }),
    );
}

export async function handleCanvasPush(change: PushChange) {
    return handleVersionedPush(
        change,
        canvases,
        (data, now) => ({
            name: data.name || 'Untitled Canvas',
            data: data.data || '{}',
            thumbnail: data.thumbnail || null,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            createdAt: now,
            updatedAt: now,
        }),
        (data, _existing, now) => ({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.data !== undefined && { data: data.data }),
            ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
            ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
            updatedAt: now,
        }),
    );
}

export async function handleBookmarkPush(change: PushChange) {
    return handleVersionedPush(
        change,
        bookmarks,
        (data, now) => ({
            url: data.url,
            title: data.title || null,
            description: data.description || null,
            image: data.image || null,
            favicon: data.favicon || null,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            createdAt: now,
            updatedAt: now,
        }),
        (data, _existing, now) => ({
            ...(data.url !== undefined && { url: data.url }),
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.image !== undefined && { image: data.image }),
            ...(data.favicon !== undefined && { favicon: data.favicon }),
            ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
            updatedAt: now,
        }),
    );
}

export async function handleJournalEntryPush(change: PushChange) {
    return handleVersionedPush(
        change,
        journalEntries,
        (data, now) => ({
            content: data.content,
            mood: data.mood || null,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            convertedTo: data.convertedTo || null,
            createdAt: now,
            updatedAt: now,
        }),
        (data, _existing, now) => ({
            ...(data.content !== undefined && { content: data.content }),
            ...(data.mood !== undefined && { mood: data.mood }),
            ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
            ...(data.convertedTo !== undefined && { convertedTo: data.convertedTo }),
            updatedAt: now,
        }),
    );
}

export async function handleSettingsPush(change: PushChange) {
    const now = new Date();

    if (change.operation === 'update') {
        const data = change.data;
        await db.update(settings)
            .set({
                ...(data.selectedProvider !== undefined && { selectedProvider: data.selectedProvider }),
                ...(data.selectedTranscriptionModel !== undefined && { selectedTranscriptionModel: data.selectedTranscriptionModel }),
                ...(data.selectedFinetuneModel !== undefined && { selectedFinetuneModel: data.selectedFinetuneModel }),
                ...(data.customSystemPrompt !== undefined && { customSystemPrompt: data.customSystemPrompt }),
                ...(data.autoFineTune !== undefined && { autoFineTune: data.autoFineTune }),
                ...(data.theme !== undefined && { theme: data.theme }),
                updatedAt: now,
            })
            .where(eq(settings.id, 1));

        await writeSyncLog('settings', '1', 'update', 1);
        return { result: { entityId: '1', status: 'ok', version: 1 } };
    }

    return { result: { entityId: change.entityId, status: 'unsupported_operation' } };
}

const handlers: Record<string, (change: PushChange) => Promise<{ result?: PushResult; conflict?: PushConflict }>> = {
    task: handleTaskPush,
    kanban_column: handleKanbanColumnPush,
    kanban_card: handleKanbanCardPush,
    canvas: handleCanvasPush,
    bookmark: handleBookmarkPush,
    journal_entry: handleJournalEntryPush,
    settings: handleSettingsPush,
};

export async function dispatchPush(change: PushChange): Promise<{ result?: PushResult; conflict?: PushConflict }> {
    const handler = handlers[change.entityType];
    if (!handler) {
        return { result: { entityId: change.entityId, status: 'unknown_entity_type' } };
    }
    return handler(change);
}
