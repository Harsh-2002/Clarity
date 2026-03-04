"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOnboarding } from "./onboarding-context"
import { PROVIDER_CONFIGS, validateApiKey, fetchAvailableModels } from "@/lib/providers"
import { saveProvider } from "@/lib/storage"
import type { ProviderConfig } from "@/lib/types"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Loader2, Key, Eye, EyeOff } from "lucide-react"
import { StepProgress } from "./step-progress"

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
      <motion.div
        initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        <StepProgress />

        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            Connect {providerConfig?.name}
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">
            Authentication Credentials
          </p>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={`Enter your ${providerConfig?.name} API Key`}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setError(null)
              }}
              className={`h-12 border-border/60 dark:border-input hover:bg-muted/20 transition-all placeholder:text-muted-foreground/50 tracking-wide text-center pr-16 ${error ? "border-destructive/50" : ""}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "Hide API key" : "Show API key"}
              title={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive tracking-wide">
              {error}
            </motion.p>
          )}


        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => setStep(2)} variant="ghost" className="flex-1 rounded-full h-12 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={handleValidateAndNext} disabled={!apiKey || isValidating} className="flex-1 rounded-full h-12 shadow-md hover:shadow-lg transition-all">
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                Authorize <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
