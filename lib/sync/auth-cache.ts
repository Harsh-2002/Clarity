import { getLocalDb } from './db';

const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedAuthState {
    authenticated: boolean;
    cachedAt: number;
}

export async function cacheAuthState(authenticated: boolean): Promise<void> {
    try {
        const db = getLocalDb();
        await db.syncMeta.put({
            key: 'authState',
            value: JSON.stringify({ authenticated, cachedAt: Date.now() } as CachedAuthState),
        });
    } catch {}
}

export async function getCachedAuthState(): Promise<CachedAuthState | null> {
    try {
        const db = getLocalDb();
        const meta = await db.syncMeta.get('authState');
        if (!meta) return null;

        const state: CachedAuthState = JSON.parse(meta.value);

        // Check TTL
        if (Date.now() - state.cachedAt > AUTH_TTL_MS) {
            await clearCachedAuthState();
            return null;
        }

        return state;
    } catch {
        return null;
    }
}

export async function clearCachedAuthState(): Promise<void> {
    try {
        const db = getLocalDb();
        await db.syncMeta.delete('authState');
    } catch {}
}
