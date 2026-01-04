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

    const settings = getSettings()
    if (!settings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
      setIsInitialized(true)
    }
  }, [isInitialized, router])

  useEffect(() => {
    if (!isOnboarded || !isInitialized || !transcriptId) return

    const transcripts = getTranscripts()
    const found = transcripts.find((t) => t.id === transcriptId)
    if (found) {
      setTranscript(found)
      const settings = getSettings()
      setCustomPrompt(settings.customSystemPrompt)
    } else {
      setError("Transcript not found")
      setState("error")
    }
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
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Fine-tune Transcription</h1>
          <p className="text-muted-foreground">Improve your transcription with AI</p>
        </div>

        {state === "input" && transcript && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Transcription</h3>
              <div className="bg-secondary rounded-lg p-4 min-h-32 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {transcript.text}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Custom Instructions (Optional)</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="E.g., Focus on technical terms, maintain punctuation, etc."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground min-h-24 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push("/transcribe")} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={handleStartFinetuning} className="flex-1">
                Fine-tune
              </Button>
            </div>
          </div>
        )}

        {state === "finetuning" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-center text-muted-foreground">Improving your transcription...</p>
          </div>
        )}

        {state === "result" && finetune && (
          <div className="space-y-4">
            <FinetuneComparison
              finetune={finetune}
              onAccept={handleAccept}
              onReject={handleReject}
              onRetry={handleRetry}
            />
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button onClick={() => router.push("/transcribe")} className="w-full">
              Back to Transcribe
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
