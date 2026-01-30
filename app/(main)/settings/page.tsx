"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Database, Check, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSettings, exportAllData, getProvider, saveSettings, logout } from "@/lib/storage"
import { fetchAvailableModels } from "@/lib/providers"
import type { AppSettings, ProviderConfig } from "@/lib/types"
import { SessionManager } from "@/components/settings/session-manager"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [provider, setProvider] = useState<ProviderConfig | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isPageReady, setIsPageReady] = useState(false)

  // Model selection states
  const [availableTranscriptionModels, setAvailableTranscriptionModels] = useState<string[]>([])
  const [availableFinetuneModels, setAvailableFinetuneModels] = useState<string[]>([])
  const [selectedTranscriptionModel, setSelectedTranscriptionModel] = useState<string>("")
  const [selectedFinetuneModel, setSelectedFinetuneModel] = useState<string>("")
  const [autoFineTune, setAutoFineTune] = useState(false)
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [dataSize, setDataSize] = useState<string>("")

  const calculateDataSize = useCallback(() => {
    const data = exportAllData()
    const json = JSON.stringify(data, null, 2)
    const bytes = new Blob([json]).size
    const kb = bytes / 1024
    const mb = kb / 1024

    if (mb >= 1) {
      setDataSize(`${mb.toFixed(2)} MB`)
    } else if (kb >= 1) {
      setDataSize(`${kb.toFixed(2)} KB`)
    } else {
      setDataSize(`${bytes} bytes`)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      // Try to load accent color from local storage first for immediate UI feedback
      const localAccent = localStorage.getItem('clarity_accent_color')
      if (localAccent) {
        // Apply instantly
        document.documentElement.style.setProperty("--primary", localAccent)
        document.documentElement.style.setProperty("--ring", localAccent)

        // Optimistically update settings state so the UI shows the correct checkmark immediately
        setSettings(prev => prev ? { ...prev, accentColor: localAccent } : {
          accentColor: localAccent,
          theme: 'system',
          onboardingComplete: true,
          encryptionDerived: true,
          autoFineTune: false
        } as AppSettings)
      }

      try {
        const appSettings = await getSettings()

        // Preserve local accent if API doesn't have it
        if (!appSettings.accentColor && localAccent) {
          appSettings.accentColor = localAccent
        }

        setIsOnboarded(true)
        setSettings(appSettings)
        setSelectedTranscriptionModel(appSettings.selectedTranscriptionModel || "")
        setSelectedFinetuneModel(appSettings.selectedFinetuneModel || "")
        setAutoFineTune(appSettings.autoFineTune || false)
        if (appSettings.selectedProvider) {
          const prov = await getProvider(appSettings.selectedProvider)
          setProvider(prov)
        }

        // Apply color from settings (source of truth)
        if (appSettings.accentColor) {
          document.documentElement.style.setProperty("--primary", appSettings.accentColor)
          document.documentElement.style.setProperty("--ring", appSettings.accentColor)
          // Sync local storage if different
          if (localAccent !== appSettings.accentColor) {
            localStorage.setItem('clarity_accent_color', appSettings.accentColor)
          }
        }
        calculateDataSize()
        setIsPageReady(true)
      } catch (e) {
        console.error("Failed to load settings", e)
      }
    }
    loadData()
  }, [router, calculateDataSize])

  useEffect(() => {
    if (isPageReady && settings?.selectedProvider && provider) {
      const timer = setTimeout(() => {
        if (settings.selectedProvider) {
          fetchModels(settings.selectedProvider, provider.apiKey)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isPageReady, settings, provider])

  const fetchModels = async (providerId: string, apiKey: string) => {
    setIsFetchingModels(true)
    const { models } = await fetchAvailableModels(providerId, apiKey)

    let transcriptionModels = models
    let finetuneModels = models

    if (providerId === "openai") {
      transcriptionModels = models.filter((m) => m.includes("whisper"))
      finetuneModels = models.filter((m) => m.includes("gpt"))
    } else if (providerId === "groq") {
      transcriptionModels = models.filter((m) => m.includes("whisper"))
      finetuneModels = models
    }

    setAvailableTranscriptionModels(transcriptionModels)
    setAvailableFinetuneModels(finetuneModels)
    setIsFetchingModels(false)
  }

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const handleSaveModelSettings = async () => {
    if (!settings) return

    const updatedSettings: AppSettings = {
      ...settings,
      selectedTranscriptionModel,
      selectedFinetuneModel,
      autoFineTune,
    }
    await saveSettings(updatedSettings)
    setSettings(updatedSettings)
    setFeedback({ type: "success", message: "Settings saved successfully" })
  }

  const handleResetProvider = async () => {
    const currentSettings = await getSettings()
    const updatedSettings = {
      ...currentSettings,
      onboardingComplete: false,
      selectedProvider: null,
      selectedTranscriptionModel: "",
      selectedFinetuneModel: "",
      customSystemPrompt: "",
    }
    await saveSettings(updatedSettings)
    router.push("/onboarding")
  }

  if (!isOnboarded || !settings) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pb-12 pt-10 md:pt-20 space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your configuration</p>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`rounded-2xl border p-4 flex items-center gap-3 animate-in fade-in ${feedback.type === "success"
              ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
              }`}
          >
            <div className="w-2 h-2 rounded-full bg-current" />
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}

        {/* Provider Configuration */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h2 className="text-xl font-semibold">Provider Configuration</h2>
            <Button onClick={handleResetProvider} variant="ghost" className="text-muted-foreground hover:text-foreground">
              Reconfigure
            </Button>
          </div>

          {/* Accent Color */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Accent Color</label>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Blue", value: "#2383e2" },
                { name: "Purple", value: "#8b5cf6" },
                { name: "Green", value: "#16a34a" },
                { name: "Orange", value: "#f59e0b" },
                { name: "Pink", value: "#ec4899" },
                { name: "Slate", value: "#737373" },
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    const newcolor = color.value
                    // Apply immediately for preview
                    document.documentElement.style.setProperty("--primary", newcolor)
                    document.documentElement.style.setProperty("--ring", newcolor)
                    // Update state
                    if (settings) {
                      const updated = { ...settings, accentColor: newcolor }
                      setSettings(updated)
                      localStorage.setItem('clarity_accent_color', newcolor)
                      saveSettings(updated)
                    }
                  }}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${(settings?.accentColor || "#2383e2") === color.value
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {(settings?.accentColor || "#2383e2") === color.value && (
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {provider && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Transcription Model</label>
                  <select
                    value={selectedTranscriptionModel}
                    onChange={(e) => setSelectedTranscriptionModel(e.target.value)}
                    className="w-full px-4 pr-12 py-2 border border-border rounded-full bg-background focus:border-foreground transition-colors outline-none cursor-pointer"
                    disabled={isFetchingModels}
                  >
                    <option value="">Select model</option>
                    {availableTranscriptionModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Fine-tuning Model</label>
                  <select
                    value={selectedFinetuneModel}
                    onChange={(e) => setSelectedFinetuneModel(e.target.value)}
                    className="w-full px-4 pr-12 py-2 border border-border rounded-full bg-background focus:border-foreground transition-colors outline-none cursor-pointer"
                    disabled={isFetchingModels}
                  >
                    <option value="">Select model</option>
                    {availableFinetuneModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Auto Fine-tune</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically refine transcripts after recording
                  </p>
                </div>
                <button
                  onClick={() => setAutoFineTune(!autoFineTune)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoFineTune ? "bg-primary" : "bg-secondary"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${autoFineTune ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={handleSaveModelSettings} className="px-8">
                  Save Changes
                </Button>
                <Button
                  onClick={() => provider && fetchModels(provider.id, provider.apiKey)}
                  variant="ghost"
                  disabled={isFetchingModels}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingModels ? "animate-spin" : ""}`} />
                  Refresh Models
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Session Management */}
        <section className="space-y-6">
          <SessionManager />
        </section>

        {/* Logout */}
        <section className="space-y-4">
          <div className="border-b border-border/40 pb-4">
            <h2 className="text-xl font-semibold">Account</h2>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <LogOut className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-muted-foreground">
                  Log out of all sessions and clear local data
                </p>
              </div>
            </div>
            <Button onClick={logout} variant="destructive" className="px-6">
              Sign Out
            </Button>
          </div>
        </section>

        {/* Data Size Indicator */}
        <section className="space-y-4">
          <div className="border-b border-border/40 pb-4">
            <h2 className="text-xl font-semibold">Storage</h2>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Total Data Size</p>
                <p className="text-xs text-muted-foreground">All notes, tasks, and transcripts</p>
              </div>
            </div>
            {dataSize && (
              <div className="px-4 py-2 rounded-full bg-background border border-border/50 text-sm font-mono">
                {dataSize}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

