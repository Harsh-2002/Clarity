import type { AppSettings, ProviderConfig, Transcript, FinetuneRequest, Session } from "./types"

// API Base URL - routes to Next.js API running on same origin
const API_BASE = "/api/v1"

// Token management (cookie-based auth)
// Access/refresh tokens are stored as httpOnly cookies.
// Keep these helpers for compatibility with older call sites.
const TOKEN_KEY = "clarity_access_token"

export function setAccessToken(_token: string) {
  // No-op: access token is httpOnly; not available to JS.
  clearAccessToken()
}

export function getAccessToken(): string | null {
  // httpOnly token is not readable from JS.
  return null
}

export function clearAccessToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })

    if (!res.ok) return false

    // Cookie is set server-side; response body can be ignored.
    await res.json().catch(() => undefined)
    return true
  } catch (e) {
    console.error("Token refresh failed", e)
    return false
  }
}

// Helper for authenticated fetch (cookie-based)
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"]
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include",
  }

  let res = await fetch(`${API_BASE}${path}`, fetchOptions)

  if (res.status === 401) {
    clearAccessToken()
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, fetchOptions)
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized")
    }
    throw new Error(await res.text())
  }

  return res.json()
}

// --- Providers ---

export async function saveProvider(provider: ProviderConfig): Promise<ProviderConfig> {
  // Backend supports Upsert on PUT /:id
  return apiFetch<ProviderConfig>(`/providers/${provider.id}`, {
    method: "PUT",
    body: JSON.stringify(provider),
  })
}

export async function getProviders(): Promise<ProviderConfig[]> {
  try {
    return await apiFetch<ProviderConfig[]>("/providers")
  } catch (e) {
    console.error("Failed to fetch providers", e)
    return []
  }
}

export async function getProvider(id: string): Promise<ProviderConfig | null> {
  try {
    return await apiFetch<ProviderConfig>(`/providers/${id}`)
  } catch {
    return null
  }
}

export async function deleteProvider(id: string): Promise<void> {
  await apiFetch(`/providers/${id}`, { method: "DELETE" })
}

// --- Settings ---

// --- Settings ---

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  // We only support one settings row per user
  return apiFetch<AppSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  })
}

export async function getSettings(): Promise<AppSettings> {
  // If apiFetch throws (e.g. 401), we want to propagate it so the UI can redirect to login
  try {
    const settings = await apiFetch<AppSettings>("/settings")

    // Merge with defaults
    const defaults: AppSettings = {
      selectedProvider: null,
      selectedTranscriptionModel: null,
      selectedFinetuneModel: null,
      customSystemPrompt: "",
      autoFineTune: false,
      encryptionDerived: true,
      theme: "system",
      onboardingComplete: false,
    }
    return { ...defaults, ...settings }
  } catch (error) {
    // If it's a 401/Unauthorized, rethrow so page checks can handle it.
    // Other errors (like 500) might fallback to defaults or also throw.
    // apiFetch throws "Unauthorized" for 401.
    // If it's a 401/Unauthorized, rethrow so page checks can handle it.
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }

    // CRITICAL FIX: Do NOT return defaults on error.
    // Returning defaults (where onboardingComplete: false) causes the app to 
    // think the user is new whenever there is a network glitch or server error.
    // It is better to fail loud (throw) so the UI shows an error/loading state
    // rather than redirecting to onboarding.
    console.error("Failed to fetch settings", error);
    throw error;
  }
}

// --- Transcripts ---

export async function saveTranscript(transcript: Transcript): Promise<Transcript> {
  if (transcript.id) {
    // Try update first; if not found, create
    try {
      return await apiFetch<Transcript>(`/transcripts/${transcript.id}`, {
        method: "PUT",
        body: JSON.stringify(transcript),
      })
    } catch (e) {
      // If 404/not found, fall through to create
      if (e instanceof Error && (e.message.includes("not found") || e.message.includes("Not found"))) {
        return apiFetch<Transcript>("/transcripts", {
          method: "POST",
          body: JSON.stringify(transcript),
        })
      }
      throw e
    }
  }
  return apiFetch<Transcript>("/transcripts", {
    method: "POST",
    body: JSON.stringify(transcript),
  })
}

export async function getTranscripts(): Promise<Transcript[]> {
  try {
    return await apiFetch<Transcript[]>("/transcripts")
  } catch (e) {
    console.error("Failed to fetch transcripts", e)
    return []
  }
}

export async function deleteTranscript(id: string): Promise<void> {
  await apiFetch(`/transcripts/${id}`, { method: "DELETE" })
}

// --- Audio Storage (New) ---

export interface UploadResponse {
  id: string
  url: string
  size: number
  mimeType: string
}

export async function uploadAudio(blob: Blob): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append("file", blob)

  // Use apiFetch to ensure headers (Auth) are handled correctly.
  // apiFetch automatically handles FormData content-type stripping.
  return apiFetch<UploadResponse>("/storage/upload", {
    method: "POST",
    body: formData,
  })
}

// --- Finetuning ---

export async function saveFinetuning(finetune: FinetuneRequest): Promise<void> {
  if (!finetune.transcriptId || !finetune.finetumedText) {
    console.warn("saveFinetuning: missing transcriptId or finetumedText")
    return
  }
  await apiFetch(`/transcripts/${finetune.transcriptId}`, {
    method: "PUT",
    body: JSON.stringify({ fineTunedText: finetune.finetumedText }),
  })
}

export async function getFinetunings(): Promise<FinetuneRequest[]> {
  return [] // Not implemented in backend yet
}

// --- Drafts (Session Storage still okay for temporary drafts) ---

export function saveDraft(audioBlob: Blob, duration: number): string {
  const draftId = `draft-${Date.now()}`
  sessionStorage.setItem('transcription-draft', JSON.stringify({
    id: draftId,
    duration,
    timestamp: Date.now(),
  }))
  return draftId
}

export function getDraft(): { id: string; duration: number; timestamp: number } | null {
  const stored = sessionStorage.getItem('transcription-draft')
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function clearDraft(): void {
  sessionStorage.removeItem('transcription-draft')
}

// --- Migration (One-time) ---

export async function syncLocalStorageToServer() {
  if (typeof window === 'undefined') return

  const hasMigrated = localStorage.getItem('migrated_to_server')
  if (hasMigrated) return

  console.log('Starting migration to server...')

  // 1. Settings
  const localSettings = localStorage.getItem('audio-app:settings')
  if (localSettings) {
    try {
      const settings = JSON.parse(localSettings)
      await saveSettings(settings)
    } catch (e) { console.error('Settings migration failed', e) }
  }

  // 2. Encryption Key (We don't migrate this, we use server env key now)
  // This means previous encrypted data in local storage MIGHT be unreadable if we don't handle it carefully.
  // Ideally, we would decrypt locally using the old password, then send smooth data to server.
  // For this step, we assume the user is starting fresh or we accept data loss on old local-only encrypted items 
  // unless we implement a complex client-side decryption + re-upload flow.

  // Given user request "login... everything stored on server side... data will always load from backend",
  // we prioritize the new flow.

  localStorage.setItem('migrated_to_server', 'true')
}


// --- Sessions ---

export async function getSessions(): Promise<Session[]> {
  try {
    return await apiFetch<Session[]>("/auth/sessions")
  } catch (e) {
    // Suppress unauthorized errors as they are expected when session expires
    if (e instanceof Error && e.message === "Unauthorized") {
      return []
    }
    console.error("Failed to fetch sessions", e)
    return []
  }
}

export async function revokeSession(id: string): Promise<void> {
  await apiFetch(`/auth/sessions/${id}`, { method: "DELETE" })
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" })
  } catch {
    // ignore
  }

  clearAccessToken()

  // Reset auth guard cache so next login goes through full check
  try {
    const { resetAuthGuard } = await import("@/components/auth-guard")
    resetAuthGuard()
  } catch {}

  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

// --- Data Management ---

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) return [] as unknown as T
  return res.json()
}

export async function exportAllData(): Promise<any> {
  const [settings, providers, transcripts, notes, tasks, journal, bookmarks, canvases, kanban] = await Promise.all([
    getSettings(),
    getProviders(),
    getTranscripts(),
    apiFetch<any[]>("/notes"),
    fetchJson<any[]>("/api/tasks"),
    fetchJson<any[]>("/api/journal"),
    fetchJson<any[]>("/api/bookmarks"),
    fetchJson<any[]>("/api/canvas"),
    fetchJson<any>("/api/kanban"),
  ])
  return {
    version: 2,
    timestamp: Date.now(),
    settings,
    providers,
    transcripts,
    notes,
    tasks,
    journal,
    bookmarks,
    canvases,
    kanban,
  }
}

export async function importData(data: any): Promise<void> {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid import data")
  }

  // Import settings
  if (data.settings) {
    await saveSettings(data.settings).catch(e => console.error("Import settings failed:", e))
  }

  // Import providers
  if (Array.isArray(data.providers)) {
    for (const provider of data.providers) {
      await saveProvider(provider).catch(e => console.error("Import provider failed:", e))
    }
  }

  // Import transcripts
  if (Array.isArray(data.transcripts)) {
    for (const transcript of data.transcripts) {
      await saveTranscript(transcript).catch(e => console.error("Import transcript failed:", e))
    }
  }

  // Import notes
  if (Array.isArray(data.notes)) {
    for (const note of data.notes) {
      await apiFetch("/notes", {
        method: "POST",
        body: JSON.stringify(note),
      }).catch(e => console.error("Import note failed:", e))
    }
  }

  // Import tasks
  if (Array.isArray(data.tasks)) {
    for (const task of data.tasks) {
      await fetch("/api/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      }).catch(e => console.error("Import task failed:", e))
    }
  }

  // Import journal entries
  if (Array.isArray(data.journal)) {
    for (const entry of data.journal) {
      await fetch("/api/journal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(e => console.error("Import journal entry failed:", e))
    }
  }

  // Import bookmarks
  if (Array.isArray(data.bookmarks)) {
    for (const bookmark of data.bookmarks) {
      await fetch("/api/bookmarks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookmark),
      }).catch(e => console.error("Import bookmark failed:", e))
    }
  }
}

export async function clearAllData(): Promise<void> {
  // Delete all transcripts
  const transcripts = await getTranscripts()
  await Promise.all(transcripts.map(t => deleteTranscript(t.id)))

  // Reset settings
  const settings = await getSettings()
  await saveSettings({
    ...settings,
    onboardingComplete: false,
    selectedProvider: null,
    selectedTranscriptionModel: null
  })
}
