"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { isOfflineSyncEnabled } from './pwa-detection';
import { SyncEngine } from './engine';

/**
 * useSyncedQuery — reads from IndexedDB in PWA mode, network fetch in browser mode.
 * Subscribes to sync engine events for auto-refresh.
 */
export function useSyncedQuery<T>(
    localQuery: () => Promise<T>,
    networkFetch: () => Promise<T>,
    deps: any[] = []
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (isOfflineSyncEnabled()) {
                // Ensure initial sync is done
                const engine = SyncEngine.getInstance();
                try {
                    await engine.initialSync();
                } catch {
                    // If initial sync fails (offline), still try local data
                }

                const localData = await localQuery();
                if (mountedRef.current) setData(localData);
            } else {
                const networkData = await networkFetch();
                if (mountedRef.current) setData(networkData);
            }
        } catch (err) {
            if (mountedRef.current) setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        // Subscribe to sync engine for refreshes in PWA mode
        let unsub: (() => void) | undefined;
        if (isOfflineSyncEnabled()) {
            const engine = SyncEngine.getInstance();
            unsub = engine.subscribe(() => {
                if (mountedRef.current) {
                    localQuery().then(d => {
                        if (mountedRef.current) setData(d);
                    }).catch(() => {});
                }
            });
        }

        return () => {
            mountedRef.current = false;
            unsub?.();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

/**
 * useSyncedMutation — writes to IndexedDB + queues in PWA mode, calls API directly in browser mode.
 */
export function useSyncedMutation<TInput, TOutput = void>(
    localMutate: (input: TInput) => Promise<TOutput>,
    networkMutate: (input: TInput) => Promise<TOutput>
): {
    mutate: (input: TInput) => Promise<TOutput>;
    loading: boolean;
} {
    const [loading, setLoading] = useState(false);

    const mutate = useCallback(async (input: TInput): Promise<TOutput> => {
        setLoading(true);
        try {
            if (isOfflineSyncEnabled()) {
                return await localMutate(input);
            } else {
                return await networkMutate(input);
            }
        } finally {
            setLoading(false);
        }
    }, [localMutate, networkMutate]);

    return { mutate, loading };
}
