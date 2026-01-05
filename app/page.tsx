"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSettings } from "@/lib/storage"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const settings = getSettings()
    const destination = settings.onboardingComplete ? "/transcribe" : "/onboarding"
    router.replace(destination)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
