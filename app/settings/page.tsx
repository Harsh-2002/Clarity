"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Download, Upload, Trash2, Gear, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSettings, exportAllData, importData, clearAllData, getProvider, saveSettings, saveProvider, getTranscripts } from "@/lib/storage"
import { fetchAvailableModels } from "@/lib/providers"
import type { AppSettings, ProviderConfig } from "@/lib/types"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [provider, setProvider] = useState<ProviderConfig | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isPageReady, setIsPageReady] = useState(false)
  
  // Model selection states
  const [availableTranscriptionModels, setAvailableTranscriptionModels] = useState<string[]>([])
  const [availableFinetuneModels, setAvailableFinetuneModels] = useState<string[]>([])
  const [selectedTranscriptionModel, setSelectedTranscriptionModel] = useState<string>("")
  const [selectedFinetuneModel, setSelectedFinetuneModel] = useState<string>("")
  const [autoFineTune, setAutoFineTune] = useState(false)
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [dataSize, setDataSize] = useState<string>("")

  // Initial load - don't fetch models immediately
  useEffect(() => {
    const appSettings = getSettings()
    if (!appSettings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
      setSettings(appSettings)
      setSelectedTranscriptionModel(appSettings.selectedTranscriptionModel || "")
      setSelectedFinetuneModel(appSettings.selectedFinetuneModel || "")
      setAutoFineTune(appSettings.autoFineTune || false)
      if (appSettings.selectedProvider) {
        const prov = getProvider(appSettings.selectedProvider)
        setProvider(prov)
      }
      // Calculate data size
      calculateDataSize()
      // Mark page as ready immediately
      setIsPageReady(true)
    }
  }, [router])

  // Defer model fetching to after page render
  useEffect(() => {
    if (isPageReady && settings?.selectedProvider && provider) {
      const timer = setTimeout(() => {
        fetchModels(settings.selectedProvider, provider.apiKey)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isPageReady, settings, provider])

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

  const handleSaveModelSettings = () => {
    if (!settings) return
    
    const updatedSettings: AppSettings = {
      ...settings,
      selectedTranscriptionModel,
      selectedFinetuneModel,
      autoFineTune,
    }
    saveSettings(updatedSettings)
    setSettings(updatedSettings)
    setFeedback({ type: "success", message: "Settings saved successfully" })
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const data = exportAllData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transcription-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setFeedback({ type: "success", message: "Data exported successfully" })
    } catch (error) {
      setFeedback({ type: "error", message: "Failed to export data" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        importData(data)
        setFeedback({ type: "success", message: "Data imported successfully. Refreshing..." })
        setTimeout(() => window.location.reload(), 1500)
      } catch (error) {
        setFeedback({ type: "error", message: "Failed to import data. Please check the file format." })
      } finally {
        setIsImporting(false)
      }
    }
    input.click()
  }

  const handleClearData = () => {
    setShowClearConfirm(true)
  }

  const confirmClearData = () => {
    clearAllData()
    setFeedback({ type: "success", message: "All data cleared. Redirecting..." })
    setTimeout(() => router.push("/onboarding"), 1500)
  }

  const handleResetProvider = () => {
    const currentSettings = getSettings()
    const updatedSettings = {
      ...currentSettings,
      onboardingComplete: false,
      selectedProvider: null,
      selectedTranscriptionModel: "",
      selectedFinetuneModel: "",
      customSystemPrompt: "",
    }
    saveSettings(updatedSettings)
    router.push("/onboarding")
  }

  if (!isOnboarded || !settings) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your configuration and data</p>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`rounded-lg border p-4 flex items-center gap-3 animate-in fade-in ${
              feedback.type === "success"
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
            <h2 className="text-xl font-light">Provider Configuration</h2>
            <Button onClick={handleResetProvider} variant="ghost" className="text-muted-foreground hover:text-foreground">
              Reconfigure
            </Button>
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoFineTune ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform ${
                      autoFineTune ? "translate-x-6" : "translate-x-1"
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

        {/* Data Management */}
        <section className="space-y-6">
          <div className="border-b border-border/40 pb-4">
            <h2 className="text-xl font-light">Data Management</h2>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleExportData}
              variant="outline"
              disabled={isExporting}
              className="w-full h-auto py-4 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 border-border/40 group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-xs text-muted-foreground font-normal">Backup your transcripts</div>
                </div>
              </div>
              {dataSize && (
                <div className="px-3 py-1 rounded-full bg-secondary text-xs font-mono text-muted-foreground">
                  {dataSize}
                </div>
              )}
            </Button>
            <Button
              onClick={handleImportData}
              variant="outline"
              disabled={isImporting}
              className="w-full h-auto py-4 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 border-border/40 group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Import Data</div>
                  <div className="text-xs text-muted-foreground font-normal">Restore from backup</div>
                </div>
              </div>
            </Button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-light text-destructive">Danger Zone</h2>
          </div>

          {!showClearConfirm ? (
            <Button 
              onClick={handleClearData} 
              variant="ghost" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start px-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete all data
            </Button>
          ) : (
            <div className="bg-destructive/5 rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <h3 className="font-medium text-destructive">Are you sure?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently delete all your transcripts and settings. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowClearConfirm(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={confirmClearData} variant="destructive">
                  Yes, delete everything
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
