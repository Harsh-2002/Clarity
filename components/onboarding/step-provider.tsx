"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"
import { PROVIDER_CONFIGS } from "@/lib/providers"

export function StepProvider() {
  const { setStep, selectedProvider, setSelectedProvider } = useOnboarding()

  const providers = Object.values(PROVIDER_CONFIGS)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Choose Provider</h2>
          <p className="text-muted-foreground">Select your transcription service</p>
        </div>

        <div className="space-y-3">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id as "openai" | "groq" | "assemblyai")}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedProvider === provider.id ? "border-primary bg-secondary" : "border-border hover:border-primary"
              }`}
            >
              <div className="font-semibold">{provider.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Max size: {(provider.limits.maxFileSize / 1024 / 1024).toFixed(0)} MB
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
            Back
          </Button>
          <Button onClick={() => setStep(3)} disabled={!selectedProvider} className="flex-1">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
