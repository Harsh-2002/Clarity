import { db } from './client';
import { syncLog } from './schema';

export async function writeSyncLog(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    version: number
) {
    await db.insert(syncLog).values({
        entityType,
        entityId,
        operation,
        version,
        timestamp: new Date(),
    });
}
