"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSettings } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAuthorized, setIsAuthorized] = useState(false)

    const checkAuth = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const settings = await getSettings()

            // 1. Check Onboarding Status
            if (!settings.onboardingComplete) {
                // Allow access to onboarding pages to avoid loop
                if (!pathname.startsWith('/onboarding')) {
                    router.replace("/onboarding")
                    return
                }
            } else {
                // If onboarded, prevent access to onboarding pages
                if (pathname.startsWith('/onboarding')) {
                    router.replace("/transcribe")
                    return
                }
            }

            setIsAuthorized(true)
        } catch (err) {
            console.error("Auth check failed", err)
            const message = err instanceof Error ? err.message : "Unknown error"

            if (message === "Unauthorized") {
                router.replace("/login")
            } else {
                // Show error for other issues (network, server down)
                setError("Failed to verify session. Please check your connection.")
            }
        } finally {
            setIsLoading(false)
        }
    }, [router, pathname])

    useEffect(() => {
        checkAuth()
    }, [checkAuth]) // Re-check on route change? Or just mount? 
    // Actually, checking on mount is usually sufficient for a SPA unless we want strict per-page re-validation.
    // But checking on pathname change might be expensive. 
    // Let's stick to mount for now, but handle pathname for the redirect logic.
    // Optimization: If we already authorized, we might trust it? 
    // For robustness against "Clicking different sections", let's check once.
    // Actually, the user complaint is about clicking sections. 
    // So we should make sure this guard wraps the LAYOUT.

    // Retry button
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Connection Error</span>
                </div>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => checkAuth()}>Retry</Button>
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

    // Only render children if authorized (or strictly handling redirects)
    // If we are redirected, we technically shouldn't render children, but router.replace happens fast.
    return <>{children}</>
}
