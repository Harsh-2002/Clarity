"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Upload, Trash2, SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSettings, exportAllData, importData, clearAllData, getProvider, saveSettings } from "@/lib/storage"
import type { AppSettings } from "@/lib/types"

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [provider, setProvider] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    const appSettings = getSettings()
    if (!appSettings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
      setSettings(appSettings)
      if (appSettings.selectedProvider) {
        setProvider(getProvider(appSettings.selectedProvider))
      }
    }
  }, [router])

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

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
    setShowResetConfirm(true)
  }

  const confirmResetProvider = () => {
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
    setShowResetConfirm(false)
    router.push("/onboarding")
  }

  if (!isOnboarded || !settings) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-8 h-8" />
              <h1 className="text-4xl font-bold">Settings</h1>
            </div>
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
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Provider Configuration</h2>
            <p className="text-sm text-muted-foreground">Your current transcription setup</p>

            {provider && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</p>
                  <p className="text-lg font-medium">{provider.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Transcription Model
                  </p>
                  <p className="text-lg font-medium">{settings.selectedTranscriptionModel}</p>
                </div>
                {settings.selectedFinetuneModel && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Fine-tune Model
                    </p>
                    <p className="text-lg font-medium">{settings.selectedFinetuneModel}</p>
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleResetProvider} variant="outline" className="w-full sm:w-auto bg-transparent">
              Reconfigure Provider
            </Button>
          </div>

          {/* Data Management */}
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Data Management</h2>
            <p className="text-sm text-muted-foreground">
              All data is encrypted locally and never shared with external servers. Export your data as a backup.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleExportData}
                variant="outline"
                disabled={isExporting}
                className="flex items-center gap-2 bg-transparent"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Export Data"}
              </Button>
              <Button
                onClick={handleImportData}
                variant="outline"
                disabled={isImporting}
                className="flex items-center gap-2 bg-transparent"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? "Importing..." : "Import Data"}
              </Button>
            </div>

            <div className="mt-4 p-3 bg-secondary rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Backup Information:</p>
              <p>Your backup includes all transcripts, settings, API keys (encrypted), and preferences.</p>
              <p>Keep backups in a safe location for data recovery.</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-destructive/20 rounded-lg p-6 space-y-4 bg-destructive/5">
            <h2 className="text-xl font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions. Please export your data before proceeding.
            </p>

            <Button onClick={handleClearData} variant="destructive" className="w-full sm:w-auto">
              Delete All Data
            </Button>
          </div>

          {showResetConfirm && (
            <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">Reset Provider Configuration?</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                  You'll need to complete the onboarding process again to set up your provider.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowResetConfirm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmResetProvider} variant="destructive" className="flex-1">
                  Reset
                </Button>
              </div>
            </div>
          )}

          {showClearConfirm && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200">Delete All Data?</h3>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  This will permanently delete all your transcripts and settings. This action cannot be undone. Please
                  make sure you've exported your data as a backup.
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowClearConfirm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmClearData} variant="destructive" className="flex-1">
                  Delete Everything
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
