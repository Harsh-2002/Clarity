import Dexie, { type Table } from 'dexie';

// Local data interfaces (timestamps as Unix ms numbers for consistent IndexedDB indexing)
export interface LocalNote {
    id: string;
    title: string;
    content: string;
    isPublished?: boolean;
    publishedSlug?: string | null;
    viewCount?: number;
    version: number;
    tags?: string | null;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalTranscript {
    id: string;
    recordingId?: string | null;
    text: string;
    fineTunedText?: string | null;
    provider: string;
    model: string;
    tags?: string | null;
    version: number;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalTask {
    id: string;
    text: string;
    completed: boolean;
    priority: string;
    dueDate?: number | null;
    position: number;
    tags?: string | null;
    version: number;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalKanbanColumn {
    id: string;
    title: string;
    position: number;
    version: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalKanbanCard {
    id: string;
    columnId: string;
    title: string;
    description?: string | null;
    position: number;
    version: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalCanvas {
    id: string;
    name: string;
    data: string;
    thumbnail?: string | null;
    tags?: string | null;
    version: number;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalBookmark {
    id: string;
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    favicon?: string | null;
    tags?: string | null;
    version: number;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalJournalEntry {
    id: string;
    content: string;
    mood?: string | null;
    tags?: string | null;
    convertedTo?: string | null;
    version: number;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number | null;
}

export interface LocalSettings {
    id: number;
    selectedProvider?: string | null;
    selectedTranscriptionModel?: string | null;
    selectedFinetuneModel?: string | null;
    customSystemPrompt?: string | null;
    autoFineTune?: boolean;
    onboardingComplete?: boolean;
    theme?: string;
    updatedAt?: number | null;
}

export interface PendingMutation {
    id?: number; // auto-increment
    entityType: string;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    data: any;
    expectedVersion?: number;
    clientTimestamp: number;
    retryCount: number;
}

export interface SyncMeta {
    key: string;
    value: string;
}

class ClarityDB extends Dexie {
    notes!: Table<LocalNote, string>;
    transcripts!: Table<LocalTranscript, string>;
    tasks!: Table<LocalTask, string>;
    kanbanColumns!: Table<LocalKanbanColumn, string>;
    kanbanCards!: Table<LocalKanbanCard, string>;
    canvases!: Table<LocalCanvas, string>;
    bookmarks!: Table<LocalBookmark, string>;
    journalEntries!: Table<LocalJournalEntry, string>;
    settings!: Table<LocalSettings, number>;
    pendingMutations!: Table<PendingMutation, number>;
    syncMeta!: Table<SyncMeta, string>;

    constructor() {
        super('ClarityOffline');

        this.version(1).stores({
            notes: 'id, updatedAt',
            transcripts: 'id, updatedAt',
            tasks: 'id, updatedAt, completed',
            kanbanColumns: 'id, position',
            kanbanCards: 'id, columnId, position',
            canvases: 'id, updatedAt',
            bookmarks: 'id, url, createdAt',
            journalEntries: 'id, createdAt',
            settings: 'id',
            pendingMutations: '++id, entityType, entityId',
            syncMeta: 'key',
        });
    }
}

let _db: ClarityDB | null = null;

export function getLocalDb(): ClarityDB {
    if (!_db) {
        _db = new ClarityDB();
    }
    return _db;
}

// Convert server Date objects (ISO strings) to Unix ms
export function dateToMs(date: any): number {
    if (!date) return Date.now();
    if (typeof date === 'number') return date;
    return new Date(date).getTime();
}

// Helper to convert a server entity to local format
export function toLocalTimestamps<T extends Record<string, any>>(entity: T): T {
    const result: Record<string, any> = { ...entity };
    for (const key of ['createdAt', 'updatedAt', 'deletedAt', 'dueDate']) {
        if (key in result && result[key] !== null && result[key] !== undefined) {
            result[key] = dateToMs(result[key]);
        }
    }
    return result as T;
}
