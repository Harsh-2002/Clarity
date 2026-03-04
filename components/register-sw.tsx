"use client"

import { useEffect } from "react"

export function RegisterServiceWorker() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                console.log("SW registered:", registration.scope)
            })
            .catch((error) => {
                console.log("SW registration failed:", error)
            })

        // Listen for background sync messages from SW
        navigator.serviceWorker.addEventListener("message", async (event) => {
            if (event.data?.type === "SYNC_REQUESTED") {
                try {
                    const { SyncEngine } = await import("@/lib/sync/engine")
                    const engine = SyncEngine.getInstance()
                    await engine.sync()
                } catch (err) {
                    console.error("Background sync trigger failed:", err)
                }
            }
        })
    }, [])

    return null
}
