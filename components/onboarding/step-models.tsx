"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"

export function StepModels() {
  const {
    setStep,
    transcriptionModel,
    setTranscriptionModel,
    finetuneModel,
    setFinetuneModel,
    availableTranscriptionModels,
    availableFinetuneModels,
  } = useOnboarding()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Select Models</h2>
          <p className="text-muted-foreground">Choose your preferred AI models</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Transcription Model</label>
            <select
              value={transcriptionModel}
              onChange={(e) => setTranscriptionModel(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="">Select model</option>
              {availableTranscriptionModels.length > 0 ? (
                availableTranscriptionModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option disabled>No transcription models available</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Fine-tuning Model (Optional)</label>
            <select
              value={finetuneModel}
              onChange={(e) => setFinetuneModel(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="">Skip fine-tuning</option>
              {availableFinetuneModels.length > 0 ? (
                availableFinetuneModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                <option disabled>No fine-tuning models available</option>
              )}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
            Back
          </Button>
          <Button onClick={() => setStep(5)} disabled={!transcriptionModel} className="flex-1">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
