export function isPWAMode(): boolean {
    if (typeof window === 'undefined') return false;

    // Check display-mode: standalone (Chrome/Edge/Firefox)
    if (window.matchMedia('(display-mode: standalone)').matches) return true;

    // Check iOS Safari standalone
    if ((navigator as any).standalone === true) return true;

    return false;
}

export function isOfflineSyncEnabled(): boolean {
    if (typeof window === 'undefined') return false;

    // Dev override
    if (localStorage.getItem('clarity_force_offline_sync') === 'true') return true;

    return isPWAMode();
}
