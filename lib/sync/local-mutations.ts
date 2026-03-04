import { getLocalDb, type LocalTask, type LocalKanbanColumn, type LocalKanbanCard, type LocalCanvas, type LocalBookmark, type LocalJournalEntry } from './db';
import { SyncEngine } from './engine';

const engine = () => SyncEngine.getInstance();

// ---- Tasks ----
export async function createLocalTask(task: LocalTask) {
    const db = getLocalDb();
    await db.tasks.put(task);
    await engine().queueMutation({
        entityType: 'task',
        entityId: task.id,
        operation: 'create',
        data: task,
    });
}

export async function updateLocalTask(id: string, updates: Partial<LocalTask>) {
    const db = getLocalDb();
    const existing = await db.tasks.get(id);
    if (!existing) return;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await db.tasks.put(updated);
    await engine().queueMutation({
        entityType: 'task',
        entityId: id,
        operation: 'update',
        expectedVersion: existing.version,
        data: updates,
    });
}

export async function deleteLocalTask(id: string) {
    const db = getLocalDb();
    await db.tasks.delete(id);
    await engine().queueMutation({
        entityType: 'task',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}

// ---- Kanban Columns ----
export async function createLocalKanbanColumn(col: LocalKanbanColumn) {
    const db = getLocalDb();
    await db.kanbanColumns.put(col);
    await engine().queueMutation({
        entityType: 'kanban_column',
        entityId: col.id,
        operation: 'create',
        data: col,
    });
}

export async function updateLocalKanbanColumn(id: string, updates: Partial<LocalKanbanColumn>) {
    const db = getLocalDb();
    const existing = await db.kanbanColumns.get(id);
    if (!existing) return;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await db.kanbanColumns.put(updated);
    await engine().queueMutation({
        entityType: 'kanban_column',
        entityId: id,
        operation: 'update',
        expectedVersion: existing.version,
        data: updates,
    });
}

export async function deleteLocalKanbanColumn(id: string) {
    const db = getLocalDb();
    // Delete associated cards
    const cards = await db.kanbanCards.where('columnId').equals(id).toArray();
    for (const card of cards) {
        await deleteLocalKanbanCard(card.id);
    }
    await db.kanbanColumns.delete(id);
    await engine().queueMutation({
        entityType: 'kanban_column',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}

// ---- Kanban Cards ----
export async function createLocalKanbanCard(card: LocalKanbanCard) {
    const db = getLocalDb();
    await db.kanbanCards.put(card);
    await engine().queueMutation({
        entityType: 'kanban_card',
        entityId: card.id,
        operation: 'create',
        data: card,
    });
}

export async function updateLocalKanbanCard(id: string, updates: Partial<LocalKanbanCard>) {
    const db = getLocalDb();
    const existing = await db.kanbanCards.get(id);
    if (!existing) return;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await db.kanbanCards.put(updated);
    await engine().queueMutation({
        entityType: 'kanban_card',
        entityId: id,
        operation: 'update',
        expectedVersion: existing.version,
        data: updates,
    });
}

export async function deleteLocalKanbanCard(id: string) {
    const db = getLocalDb();
    await db.kanbanCards.delete(id);
    await engine().queueMutation({
        entityType: 'kanban_card',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}

// ---- Canvases ----
export async function createLocalCanvas(canvas: LocalCanvas) {
    const db = getLocalDb();
    await db.canvases.put(canvas);
    await engine().queueMutation({
        entityType: 'canvas',
        entityId: canvas.id,
        operation: 'create',
        data: canvas,
    });
}

export async function updateLocalCanvas(id: string, updates: Partial<LocalCanvas>) {
    const db = getLocalDb();
    const existing = await db.canvases.get(id);
    if (!existing) return;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await db.canvases.put(updated);
    await engine().queueMutation({
        entityType: 'canvas',
        entityId: id,
        operation: 'update',
        expectedVersion: existing.version,
        data: updates,
    });
}

export async function deleteLocalCanvas(id: string) {
    const db = getLocalDb();
    await db.canvases.delete(id);
    await engine().queueMutation({
        entityType: 'canvas',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}

// ---- Bookmarks ----
export async function createLocalBookmark(bookmark: LocalBookmark) {
    const db = getLocalDb();
    await db.bookmarks.put(bookmark);
    await engine().queueMutation({
        entityType: 'bookmark',
        entityId: bookmark.id,
        operation: 'create',
        data: bookmark,
    });
}

export async function deleteLocalBookmark(id: string) {
    const db = getLocalDb();
    await db.bookmarks.delete(id);
    await engine().queueMutation({
        entityType: 'bookmark',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}

// ---- Journal Entries ----
export async function createLocalJournalEntry(entry: LocalJournalEntry) {
    const db = getLocalDb();
    await db.journalEntries.put(entry);
    await engine().queueMutation({
        entityType: 'journal_entry',
        entityId: entry.id,
        operation: 'create',
        data: entry,
    });
}

export async function deleteLocalJournalEntry(id: string) {
    const db = getLocalDb();
    await db.journalEntries.delete(id);
    await engine().queueMutation({
        entityType: 'journal_entry',
        entityId: id,
        operation: 'delete',
        data: null,
    });
}
