"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RecorderContainer } from "@/components/audio-recorder/recorder-container"
import { TranscriptionResult } from "@/components/transcription/transcription-result"
import { Button } from "@/components/ui/button"
import { getSettings } from "@/lib/storage"
import { transcribeAudio } from "@/lib/transcription-service"
import type { Transcript } from "@/lib/types"

type PageState = "input" | "transcribing" | "result" | "error"

export default function TranscribePage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("input")
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)

  useEffect(() => {
    const settings = getSettings()
    if (!settings.onboardingComplete) {
      router.push("/onboarding")
    } else {
      setIsOnboarded(true)
    }
  }, [router])

  const handleAudioReady = async (audioBlob: Blob, fileName: string) => {
    setState("transcribing")
    setError(null)

    const result = await transcribeAudio(audioBlob, fileName)

    if (result.error) {
      setError(result.error)
      setState("error")
    } else if (result.transcript) {
      setTranscript(result.transcript)
      setState("result")
    }
  }

  const handleFinetune = () => {
    if (transcript) {
      router.push(`/fine-tune?transcriptId=${transcript.id}`)
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
    <main className="min-h-screen bg-background">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Transcribe Audio</h1>
            <p className="text-muted-foreground">Record or upload audio to get started</p>
          </div>

          {state === "input" && <RecorderContainer onAudioReady={handleAudioReady} />}

          {state === "transcribing" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-center text-muted-foreground">Transcribing your audio...</p>
            </div>
          )}

          {state === "result" && transcript && (
            <TranscriptionResult transcript={transcript} onFinetune={handleFinetune} onBack={handleStartOver} />
          )}

          {state === "error" && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button onClick={handleStartOver} className="w-full">
                Try Again
              </Button>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <Button onClick={() => router.push("/transcripts")} variant="ghost" className="w-full">
              View all transcripts
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
