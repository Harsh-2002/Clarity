"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"

export function StepWelcome() {
  const { setStep } = useOnboarding()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-center">Audio Transcription</h1>
          <p className="text-center text-muted-foreground">
            Transcribe audio with AI and fine-tune results for perfect accuracy
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            <h3 className="font-semibold mb-2">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Record or upload audio files</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Choose from multiple AI providers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Fine-tune transcriptions for accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>All data encrypted locally</span>
              </li>
            </ul>
          </div>
        </div>

        <Button onClick={() => setStep(2)} className="w-full" size="lg">
          Get Started
        </Button>
      </div>
    </div>
  )
}
