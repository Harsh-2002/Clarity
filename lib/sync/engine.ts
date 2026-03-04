import { getLocalDb, toLocalTimestamps, type PendingMutation } from './db';

type SyncListener = () => void;

class SyncEngine {
    private static instance: SyncEngine | null = null;
    private syncing = false;
    private listeners: Set<SyncListener> = new Set();
    private online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    static getInstance(): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.online = true;
                this.sync();
            });
            window.addEventListener('offline', () => {
                this.online = false;
            });
        }
    }

    subscribe(listener: SyncListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        for (const listener of this.listeners) {
            try { listener(); } catch {}
        }
    }

    async initialSync(): Promise<void> {
        const db = getLocalDb();
        const meta = await db.syncMeta.get('fullSyncComplete');
        if (meta?.value === 'true') return;

        const res = await fetch('/api/v1/sync/full', { credentials: 'include' });
        if (!res.ok) throw new Error('Initial sync failed');

        const data = await res.json();

        await db.transaction('rw', [
            db.notes, db.transcripts, db.tasks, db.kanbanColumns,
            db.kanbanCards, db.canvases, db.bookmarks, db.journalEntries,
            db.settings, db.syncMeta
        ], async () => {
            if (data.notes?.length) await db.notes.bulkPut(data.notes.map(toLocalTimestamps));
            if (data.transcripts?.length) await db.transcripts.bulkPut(data.transcripts.map(toLocalTimestamps));
            if (data.tasks?.length) await db.tasks.bulkPut(data.tasks.map(toLocalTimestamps));
            if (data.kanbanColumns?.length) await db.kanbanColumns.bulkPut(data.kanbanColumns.map(toLocalTimestamps));
            if (data.kanbanCards?.length) await db.kanbanCards.bulkPut(data.kanbanCards.map(toLocalTimestamps));
            if (data.canvases?.length) await db.canvases.bulkPut(data.canvases.map(toLocalTimestamps));
            if (data.bookmarks?.length) await db.bookmarks.bulkPut(data.bookmarks.map(toLocalTimestamps));
            if (data.journalEntries?.length) await db.journalEntries.bulkPut(data.journalEntries.map(toLocalTimestamps));
            if (data.settings) await db.settings.put(toLocalTimestamps(data.settings));

            await db.syncMeta.put({ key: 'lastSyncTimestamp', value: String(data.serverTime) });
            await db.syncMeta.put({ key: 'fullSyncComplete', value: 'true' });
        });

        this.notify();
    }

    async pull(): Promise<void> {
        const db = getLocalDb();
        const lastSyncMeta = await db.syncMeta.get('lastSyncTimestamp');
        const since = lastSyncMeta?.value || '0';

        let hasMore = true;
        let currentSince = since;

        while (hasMore) {
            const res = await fetch(`/api/v1/sync/pull?since=${currentSince}&limit=500`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Pull sync failed');

            const data = await res.json();
            hasMore = data.hasMore;

            for (const change of data.changes) {
                const table = this.getTable(change.entityType);
                if (!table) continue;

                if (change.operation === 'delete') {
                    await table.delete(change.entityId);
                } else if (change.data) {
                    const localData = toLocalTimestamps(change.data);
                    const existing = await table.get(change.entityId);
                    // Last-write-wins by version
                    if (!existing || (existing.version || 0) <= change.version) {
                        await table.put(localData);
                    }
                }

                currentSince = String(change.timestamp);
            }

            await db.syncMeta.put({ key: 'lastSyncTimestamp', value: String(data.serverTime) });
        }
    }

    async push(): Promise<void> {
        const db = getLocalDb();
        const mutations = await db.pendingMutations.orderBy('id').limit(50).toArray();
        if (mutations.length === 0) return;

        const changes = mutations.map(m => ({
            entityType: m.entityType,
            entityId: m.entityId,
            operation: m.operation,
            expectedVersion: m.expectedVersion,
            data: m.data,
        }));

        const res = await fetch('/api/v1/sync/push', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ changes }),
        });

        if (!res.ok) {
            // Network error — increment retry counts
            for (const m of mutations) {
                await db.pendingMutations.update(m.id!, { retryCount: m.retryCount + 1 });
            }
            return;
        }

        const { results, conflicts } = await res.json();

        // Process results
        const conflictIds = new Set(conflicts?.map((c: any) => c.entityId) || []);

        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            const result = results[i];

            if (result?.status === 'ok') {
                // Remove successful mutation
                await db.pendingMutations.delete(mutation.id!);

                // Update local version if returned
                if (result.version) {
                    const table = this.getTable(mutation.entityType);
                    if (table) {
                        const local = await table.get(mutation.entityId);
                        if (local) {
                            await table.update(mutation.entityId, { version: result.version });
                        }
                    }
                }
            } else if (conflictIds.has(mutation.entityId)) {
                // Server wins on conflict — remove mutation
                await db.pendingMutations.delete(mutation.id!);
            }
        }

        // Apply conflict data (server wins)
        if (conflicts?.length) {
            for (const conflict of conflicts) {
                if (conflict.serverData) {
                    // Find which entity type this belongs to
                    const mutation = mutations.find(m => m.entityId === conflict.entityId);
                    if (mutation) {
                        const table = this.getTable(mutation.entityType);
                        if (table) {
                            await table.put(toLocalTimestamps(conflict.serverData));
                        }
                    }
                }
            }
        }
    }

    async sync(): Promise<void> {
        if (this.syncing || !this.online) return;
        this.syncing = true;

        try {
            await this.push();
            await this.pull();
            this.notify();
        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            this.syncing = false;
        }
    }

    async queueMutation(mutation: Omit<PendingMutation, 'id' | 'retryCount' | 'clientTimestamp'>): Promise<void> {
        const db = getLocalDb();
        await db.pendingMutations.add({
            ...mutation,
            clientTimestamp: Date.now(),
            retryCount: 0,
        });

        if (this.online) {
            this.sync();
        } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const reg = await navigator.serviceWorker.ready;
            try {
                await (reg as any).sync.register('clarity-sync');
            } catch {}
        }
    }

    isOnline(): boolean {
        return this.online;
    }

    private getTable(entityType: string) {
        const db = getLocalDb();
        const map: Record<string, any> = {
            note: db.notes,
            transcript: db.transcripts,
            task: db.tasks,
            kanban_column: db.kanbanColumns,
            kanban_card: db.kanbanCards,
            canvas: db.canvases,
            bookmark: db.bookmarks,
            journal_entry: db.journalEntries,
            settings: db.settings,
        };
        return map[entityType] || null;
    }
}

export { SyncEngine };
