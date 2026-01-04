"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import type { AppSettings } from "@/lib/types"
import { saveSettings } from "@/lib/storage"

interface OnboardingContextType {
  step: number
  setStep: (step: number) => void
  selectedProvider: "openai" | "groq" | "assemblyai" | null
  setSelectedProvider: (provider: "openai" | "groq" | "assemblyai") => void
  apiKey: string
  setApiKey: (key: string) => void
  transcriptionModel: string
  setTranscriptionModel: (model: string) => void
  finetuneModel: string
  setFinetuneModel: (model: string) => void
  customSystemPrompt: string
  setCustomSystemPrompt: (prompt: string) => void
  completeOnboarding: () => void
  isValidating: boolean
  validationError: string | null
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1)
  const [selectedProvider, setSelectedProvider] = useState<"openai" | "groq" | "assemblyai" | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [transcriptionModel, setTranscriptionModel] = useState("")
  const [finetuneModel, setFinetuneModel] = useState("")
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const completeOnboarding = () => {
    const settings: AppSettings = {
      selectedProvider,
      selectedTranscriptionModel: transcriptionModel,
      selectedFinetuneModel: finetuneModel,
      customSystemPrompt,
      encryptionDerived: true,
      theme: "system",
      onboardingComplete: true,
    }
    saveSettings(settings)
  }

  return (
    <OnboardingContext.Provider
      value={{
        step,
        setStep,
        selectedProvider,
        setSelectedProvider,
        apiKey,
        setApiKey,
        transcriptionModel,
        setTranscriptionModel,
        finetuneModel,
        setFinetuneModel,
        customSystemPrompt,
        setCustomSystemPrompt,
        completeOnboarding,
        isValidating,
        validationError,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return context
}
