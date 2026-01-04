"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSettings } from "@/lib/storage"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const settings = getSettings()
    if (!settings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      router.push("/transcribe")
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return null
}
