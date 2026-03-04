"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { clearAccessToken } from "@/lib/storage"
import { handleDestination, resolveAppDestination } from "@/lib/client/auth-flow"

// Module-level cache — survives re-mounts during client-side navigation
let _authVerified = false

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(!_authVerified)
    const [error, setError] = useState<string | null>(null)
    const checkRan = useRef(false)

    // Apply accent color from localStorage synchronously (no flash)
    useEffect(() => {
        const localAccent = localStorage.getItem('clarity_accent_color')
        if (localAccent) {
            document.documentElement.style.setProperty("--primary", localAccent)
            document.documentElement.style.setProperty("--ring", localAccent)
        }
    }, [])

    useEffect(() => {
        // If already verified, skip entirely
        if (_authVerified) {
            setIsLoading(false)
            return
        }

        // Prevent double-run in StrictMode
        if (checkRan.current) return
        checkRan.current = true

        const checkAuth = async () => {
            setError(null)
            try {
                const destination = await resolveAppDestination()

                // Allow staying on onboarding if that's the destination
                if (destination.path === "/onboarding" && pathname.startsWith("/onboarding")) {
                    if (destination.clearToken) clearAccessToken()
                    _authVerified = true
                    return
                }

                // If destination is setup, login, or onboarding - redirect there
                if (["/setup", "/login", "/onboarding"].includes(destination.path)) {
                    handleDestination(router, destination)
                    return
                }

                // User is authenticated and onboarded
                _authVerified = true

                // Sync accent color from server settings (non-blocking)
                try {
                    const { getSettings } = await import("@/lib/storage")
                    const settings = await getSettings()
                    if (settings?.accentColor) {
                        document.documentElement.style.setProperty("--primary", settings.accentColor)
                        document.documentElement.style.setProperty("--ring", settings.accentColor)
                        const local = localStorage.getItem('clarity_accent_color')
                        if (local !== settings.accentColor) {
                            localStorage.setItem('clarity_accent_color', settings.accentColor)
                        }
                    }
                } catch {}

                // Cache auth state for offline use in PWA mode
                try {
                    const { isOfflineSyncEnabled, cacheAuthState } = await import("@/lib/sync")
                    if (isOfflineSyncEnabled()) {
                        await cacheAuthState(true)
                    }
                } catch {}
            } catch (err) {
                console.error("Auth check failed", err)

                // In PWA mode, check cached auth state before showing error
                try {
                    const { isOfflineSyncEnabled, getCachedAuthState } = await import("@/lib/sync")
                    if (isOfflineSyncEnabled()) {
                        const cachedAuth = await getCachedAuthState()
                        if (cachedAuth?.authenticated) {
                            _authVerified = true
                            setIsLoading(false)
                            return
                        }
                    }
                } catch {}

                clearAccessToken()
                setError("Failed to verify session. Please log in again.")
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [router, pathname])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Session Error</span>
                </div>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => {
                    checkRan.current = false
                    _authVerified = false
                    setIsLoading(true)
                    setError(null)
                    // Trigger re-run
                    window.location.reload()
                }}>Retry</Button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
        )
    }

    return <>{children}</>
}

/**
 * Call this on logout to reset the auth cache
 */
export function resetAuthGuard() {
    _authVerified = false
}
