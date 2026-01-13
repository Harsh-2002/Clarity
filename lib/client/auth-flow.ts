import { clearAccessToken, getSettings } from "@/lib/storage"

interface DestinationResult {
  path: string
  clearToken: boolean
}

async function fetchSetupStatus(): Promise<{ setupComplete: boolean }> {
  const res = await fetch("/api/v1/auth/status")
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized")
    }
    throw new Error(`status:${res.status}`)
  }
  return res.json()
}

export async function resolveAppDestination(): Promise<DestinationResult> {
  try {
    const { setupComplete } = await fetchSetupStatus()
    if (!setupComplete) {
      return { path: "/setup", clearToken: true }
    }

    try {
      const settings = await getSettings()
      const path = settings.onboardingComplete ? "/dashboard" : "/onboarding"
      return { path, clearToken: false }
    } catch (e: any) {
      if (e?.message === "Unauthorized") {
        return { path: "/login", clearToken: true }
      }
      return { path: "/login", clearToken: true }
    }
  } catch (e: any) {
    if (e?.message === "Unauthorized") {
      return { path: "/login", clearToken: true }
    }
    // If status check failed (e.g., DB missing), send to setup as safest fallback
    return { path: "/setup", clearToken: true }
  }
}

export function handleDestination(router: any, destination: DestinationResult) {
  if (destination.clearToken) {
    clearAccessToken()
  }
  router.replace(destination.path)
}
