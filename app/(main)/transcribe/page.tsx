"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { RecorderContainer } from "@/components/audio-recorder/recorder-container"
import { TranscriptionResult } from "@/components/transcription/transcription-result"
import { Button } from "@/components/ui/button"
import { getSettings, saveTranscript } from "@/lib/storage"
import { transcribeAudio } from "@/lib/transcription-service"
import { fineTuneText } from "@/lib/finetuning-service"
import type { Transcript } from "@/lib/types"

type PageState = "input" | "transcribing" | "finetuning" | "result" | "error"

interface BackgroundTask {
  state: PageState
  audioBlob?: Blob
  fileName?: string
  error?: string | null
  transcript?: Transcript | null
  startedAt: number
}

export default function TranscribePage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("input")
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const processingRef = useRef<boolean>(false)

  // Restore background processing state on mount
  useEffect(() => {
    // AuthGuard guarantees onboardingComplete is true
    setIsOnboarded(true)

    // Check for ongoing background task
    const taskData = sessionStorage.getItem('clarity-background-task')
    if (taskData) {
      try {
        const task: BackgroundTask = JSON.parse(taskData)

        // Only restore if task is recent (within 10 minutes)
        const elapsed = Date.now() - task.startedAt
        if (elapsed < 10 * 60 * 1000) {
          console.log('[Clarity] Restoring background task:', task.state)
          setState(task.state)
          if (task.transcript) setTranscript(task.transcript)
          if (task.error) setError(task.error)

          // If was processing, show appropriate loading state
          if (task.state === 'transcribing' || task.state === 'finetuning') {
            // Task may have completed while away, check if transcript exists
            const lastTranscript = sessionStorage.getItem('clarity-last-transcript')
            if (lastTranscript) {
              const savedTranscript = JSON.parse(lastTranscript)
              setTranscript(savedTranscript)
              setState('result')
              sessionStorage.removeItem('clarity-background-task')
            }
          }
        } else {
          // Task expired, clear it
          sessionStorage.removeItem('clarity-background-task')
        }
      } catch (e) {
        console.error('[Clarity] Failed to restore background task:', e)
        sessionStorage.removeItem('clarity-background-task')
      }
    }
  }, [router])

  // Save state to sessionStorage when it changes (for background processing)
  useEffect(() => {
    if (state === 'transcribing' || state === 'finetuning') {
      const task: BackgroundTask = {
        state,
        error,
        transcript,
        startedAt: Date.now(),
      }
      sessionStorage.setItem('clarity-background-task', JSON.stringify(task))
    } else if (state === 'result' && transcript) {
      sessionStorage.setItem('clarity-last-transcript', JSON.stringify(transcript))
      sessionStorage.removeItem('clarity-background-task')
    } else if (state === 'input') {
      sessionStorage.removeItem('clarity-background-task')
      sessionStorage.removeItem('clarity-last-transcript')
    }
  }, [state, error, transcript])

  const handleAudioReady = async (audioBlob: Blob, fileName: string, duration: number, fileId?: string) => {
    // Prevent duplicate processing
    if (state !== "input" || processingRef.current) return

    processingRef.current = true
    setState("transcribing")
    setError(null)

    try {
      // Pass fileId to ensure persistence even on failure
      const result = await transcribeAudio(audioBlob, fileName, duration, fileId)

      // If we have a transcript (even if failed), we proceed to result view
      if (result.transcript) {
        // If there was an error but we saved the transcript, show it as part of the result
        if (result.error) {
          console.warn("Transcription failed but saved as failed record:", result.error)
        }

        const settings = await import('@/lib/storage').then(m => m.getSettings())

        // No need to manually attach recordingId anymore, service does it request

        // Auto fine-tune ONLY if successful
        if (!result.error && settings.autoFineTune && settings.selectedFinetuneModel) {
          setState("finetuning")
          const fineTuneResult = await fineTuneText(result.transcript.text)
          // ... (existing finetune logic) ...

          if (fineTuneResult.success && fineTuneResult.fineTunedText) {
            console.log('[Clarity] Fine-tune result tags:', fineTuneResult.tags)
            const updatedTranscript = {
              ...result.transcript,
              fineTunedText: fineTuneResult.fineTunedText,
              tags: fineTuneResult.tags || result.transcript.tags, // Use AI tags if available
            }
            console.log('[Clarity] Saving transcript with tags:', updatedTranscript.tags)
            saveTranscript(updatedTranscript)
            setTranscript(updatedTranscript)
          } else {
            // If fine-tuning fails, just show the raw transcript
            saveTranscript(result.transcript)
            setTranscript(result.transcript)
          }
        } else {
          saveTranscript(result.transcript)
          setTranscript(result.transcript)
        }

        setState("result")
      }
    } catch (err) {
      console.error('[Clarity] Transcription error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setState("error")
    } finally {
      processingRef.current = false
    }
  }

  const handleFinetune = async () => {
    if (!transcript || state !== "result") return

    try {
      setState("finetuning")
      const fineTuneResult = await fineTuneText(transcript.text)

      if (fineTuneResult.success && fineTuneResult.fineTunedText) {
        console.log('[Clarity] Manual fine-tune tags:', fineTuneResult.tags)
        const updatedTranscript = {
          ...transcript,
          fineTunedText: fineTuneResult.fineTunedText,
          tags: fineTuneResult.tags || transcript.tags, // Update with AI tags
        }
        console.log('[Clarity] Saving manually fine-tuned transcript with tags:', updatedTranscript.tags)
        saveTranscript(updatedTranscript)
        setTranscript(updatedTranscript)
        setState("result")
      } else {
        setError(fineTuneResult.error || "Fine-tuning failed")
        setState("error")
      }
    } catch (err) {
      console.error('[Clarity] Fine-tuning error:', err)
      setError(err instanceof Error ? err.message : 'Fine-tuning failed')
      setState("error")
    }
  }

  const handleStartOver = () => {
    setState("input")
    setTranscript(null)
    setError(null)
  }

  if (!isOnboarded) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl transition-all duration-500">

          {state === "input" && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <RecorderContainer onAudioReady={handleAudioReady} />
            </div>
          )}

          {(state === "transcribing" || state === "finetuning") && (
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light tracking-tight">
                  {state === "transcribing" ? "Transcribing..." : "Refining..."}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {state === "transcribing"
                    ? "Converting your audio to text"
                    : "Polishing grammar and clarity"}
                </p>
                <p className="text-xs text-muted-foreground/60 pt-4">
                  You can navigate away - processing continues in background
                </p>
              </div>
            </div>
          )}

          {state === "result" && transcript && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <TranscriptionResult transcript={transcript} onFinetune={handleFinetune} onBack={handleStartOver} />
            </div>
          )}

          {state === "error" && (
            <div className="max-w-md mx-auto space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-2">
                <h2 className="text-xl font-medium text-destructive">Something went wrong</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={handleStartOver} variant="outline" className="min-w-[120px]">
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
