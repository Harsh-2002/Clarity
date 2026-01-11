"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSettings } from "@/lib/storage"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // 1. Check System Setup (Admin created?)
        const res = await fetch('/api/v1/auth/status');
        const { setupComplete } = await res.json();

        if (!setupComplete) {
          router.replace("/setup");
          return;
        }

        // 2. Check User Onboarding (AI Configured?)
        // If 401, getSettings throws.
        const settings = await getSettings();
        const destination = settings.onboardingComplete ? "/transcribe" : "/onboarding";
        router.replace(destination);
      } catch (e: any) {
        // Handle Auth Error
        if (e.message === "Unauthorized") {
          router.replace("/login");
          return;
        }
        // Fallback
        console.error("Status check failed", e);
      }
    };

    checkStatus();
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}
