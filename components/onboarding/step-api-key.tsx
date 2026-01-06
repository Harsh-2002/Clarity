"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboarding } from "./onboarding-context"
import { PROVIDER_CONFIGS, validateApiKey, fetchAvailableModels } from "@/lib/providers"
import { saveProvider } from "@/lib/storage"
import type { ProviderConfig } from "@/lib/types"

export function StepApiKey() {
  const {
    setStep,
    selectedProvider,
    apiKey,
    setApiKey,
    setAvailableTranscriptionModels,
    setAvailableFinetuneModels,
    setTranscriptionModel,
    setFinetuneModel,
  } = useOnboarding()
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const providerConfig = selectedProvider ? PROVIDER_CONFIGS[selectedProvider] : null

  const handleValidateAndNext = async () => {
    if (!apiKey.trim() || !selectedProvider) {
      setError("Please enter an API key")
      return
    }

    setIsValidating(true)
    setError(null)

    const validation = await validateApiKey(selectedProvider, apiKey)

    if (!validation.valid) {
      setError(validation.error || "Invalid API key")
      setIsValidating(false)
      return
    }

    // Fetch available models
    const { models, error: modelsError } = await fetchAvailableModels(selectedProvider, apiKey)

    if (modelsError || models.length === 0) {
      setError(modelsError || "Could not fetch available models")
      setIsValidating(false)
      return
    }

    // Separate transcription and fine-tuning models based on provider
    let transcriptionModels = models
    let finetuneModels = models

    if (selectedProvider === "openai") {
      transcriptionModels = models.filter((m) => m.includes("whisper"))
      finetuneModels = models.filter((m) => m.includes("gpt"))
    } else if (selectedProvider === "groq") {
      transcriptionModels = models.filter((m) => m.includes("whisper"))
      finetuneModels = models
    }

    setAvailableTranscriptionModels(transcriptionModels)
    setAvailableFinetuneModels(finetuneModels)

    // Set default models
    if (selectedProvider === "groq") {
      const defaultTranscription = transcriptionModels.find((m) => m.includes("whisper-large-v3")) || transcriptionModels[0]
      const defaultFinetune = finetuneModels.find((m) => m.includes("llama-3.1-8b-instant")) || finetuneModels[0]

      if (defaultTranscription) setTranscriptionModel(defaultTranscription)
      if (defaultFinetune) setFinetuneModel(defaultFinetune)
    } else if (selectedProvider === "openai") {
      const defaultTranscription = transcriptionModels.find((m) => m === "whisper-1") || transcriptionModels[0]
      const defaultFinetune = finetuneModels.find((m) => m.includes("gpt-4o-mini")) || finetuneModels[0]

      if (defaultTranscription) setTranscriptionModel(defaultTranscription)
      if (defaultFinetune) setFinetuneModel(defaultFinetune)
    }

    // Save provider configuration
    const provider: ProviderConfig = {
      ...providerConfig,
      apiKey,
    } as ProviderConfig
    saveProvider(provider)

    setIsValidating(false)
    setStep(4)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">API Key</h2>
          <p className="text-muted-foreground">Enter your {providerConfig?.name} API key</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError(null)
              }}
              className={`pr-16 ${error ? "border-destructive" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-xs text-muted-foreground">
            Your API key will be encrypted and stored locally. It&apos;s never sent to our servers.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
            Back
          </Button>
          <Button onClick={handleValidateAndNext} disabled={!apiKey || isValidating} className="flex-1">
            {isValidating ? "Validating..." : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}
