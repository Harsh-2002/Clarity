"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { resolveAppDestination, handleDestination } from "@/lib/client/auth-flow"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkStatus = async () => {
      const destination = await resolveAppDestination()
      handleDestination(router, destination)
    }

    checkStatus();
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
