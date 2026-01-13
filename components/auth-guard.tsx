"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { clearAccessToken } from "@/lib/storage"
import { handleDestination, resolveAppDestination } from "@/lib/client/auth-flow"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const checkAuth = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const destination = await resolveAppDestination()

            // Allow staying on onboarding if that's the destination
            if (destination.path === "/onboarding" && pathname.startsWith("/onboarding")) {
                if (destination.clearToken) clearAccessToken()
                return
            }

            // If destination is setup, login, or onboarding - redirect there
            if (["/setup", "/login", "/onboarding"].includes(destination.path)) {
                handleDestination(router, destination)
                return
            }

            // User is authenticated and onboarded - allow them to stay on their current page
            // No redirect needed, just finish loading
        } catch (err) {
            console.error("Auth check failed", err)
            clearAccessToken()
            setError("Failed to verify session. Please log in again.")
        } finally {
            setIsLoading(false)
        }
    }, [router, pathname])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Session Error</span>
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

    return <>{children}</>
}
