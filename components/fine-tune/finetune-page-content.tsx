"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getSettings, getTranscripts, saveTranscript } from "@/lib/storage"
import { fineTuneTranscript } from "@/lib/finetuning-service"
import { FinetuneComparison } from "./finetune-comparison"
import type { FinetuneRequest, Transcript } from "@/lib/types"

type PageState = "input" | "finetuning" | "result" | "error"

export function FinetunedPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<PageState>("input")
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [finetune, setFinetune] = useState<FinetuneRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)

  const transcriptId = useMemo(() => searchParams.get("transcriptId"), [searchParams])

  useEffect(() => {
    if (isInitialized) return

    const checkStatus = async () => {
      try {
        const settings = await getSettings()
        if (!settings.onboardingComplete) {
          router.push("/onboarding")
        } else {
          setIsOnboarded(true)
          setIsInitialized(true)
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Unauthorized") {
          router.replace("/login")
        }
      }
    }
    checkStatus()
  }, [isInitialized, router])

  useEffect(() => {
    if (!isOnboarded || !isInitialized || !transcriptId) return

    const loadData = async () => {
      try {
        const transcripts = await getTranscripts()
        const found = transcripts.find((t) => t.id === transcriptId)
        if (found) {
          setTranscript(found)
          const settings = await getSettings()
          setCustomPrompt(settings.customSystemPrompt || "")
        } else {
          setError("Transcript not found")
          setState("error")
        }
      } catch (err) {
        console.error("Failed to load transcript", err)
      }
    }
    loadData()
  }, [isOnboarded, isInitialized, transcriptId])

  const handleStartFinetuning = useCallback(async () => {
    if (!transcript) return

    setState("finetuning")
    setError(null)

    const result = await fineTuneTranscript(transcript.id, customPrompt)

    if (result.error) {
      setError(result.error)
      setState("error")
    } else if (result.finetune) {
      setFinetune(result.finetune)
      setState("result")
    }
  }, [transcript, customPrompt])

  // Keyboard shortcut: Ctrl/Cmd+Enter to start finetuning
  useEffect(() => {
    if (state !== "input") return

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleStartFinetuning()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [state, handleStartFinetuning])

  const handleAccept = useCallback(() => {
    if (!finetune || !transcript) return

    const updated = { ...transcript, text: finetune.finetumedText }
    saveTranscript(updated)

    router.push("/transcripts")
  }, [finetune, transcript, router])

  const handleReject = useCallback(() => {
    setState("input")
    setFinetune(null)
  }, [])

  const handleRetry = useCallback(async () => {
    handleStartFinetuning()
  }, [handleStartFinetuning])

  if (!isOnboarded) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight">Refine</h1>
        <p className="text-muted-foreground">Polish your thoughts with AI</p>
      </div>

      {state === "input" && transcript && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Original Text</h3>
            <div className="text-lg leading-relaxed font-light text-foreground/90 whitespace-pre-wrap">
              {transcript.text}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Instructions</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add specific instructions for refinement (e.g., 'Make it more concise', 'Fix grammar only')..."
              className="w-full px-4 py-3 border border-border/60 dark:border-input rounded-2xl bg-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all outline-none min-h-[100px] resize-none text-base font-light placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={handleStartFinetuning} className="px-8 h-12 text-base">
              Start Refinement
            </Button>
          </div>
        </div>
      )}

      {state === "finetuning" && (
        <div className="flex flex-col items-center justify-center space-y-6 py-20 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-primary/20 rounded-full" />
            <div className="absolute top-0 left-0 w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-light text-muted-foreground animate-pulse">Refining your thoughts...</p>
        </div>
      )}

      {state === "result" && finetune && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <FinetuneComparison
            finetune={finetune}
            onAccept={handleAccept}
            onReject={handleReject}
            onRetry={handleRetry}
          />
        </div>
      )}

      {state === "error" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-destructive/5 border-l-2 border-destructive p-6">
            <h3 className="text-destructive font-medium mb-2">Error</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => setState("input")} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}
