"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"
import type { AppSettings, ProviderConfig } from "@/lib/types"
import { saveSettings, saveProvider, setAccessToken } from "@/lib/storage"

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
  availableTranscriptionModels: string[]
  setAvailableTranscriptionModels: (models: string[]) => void
  availableFinetuneModels: string[]
  setAvailableFinetuneModels: (models: string[]) => void
  login: (password: string) => Promise<boolean>
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
  const [availableTranscriptionModels, setAvailableTranscriptionModels] = useState<string[]>([])
  const [availableFinetuneModels, setAvailableFinetuneModels] = useState<string[]>([])

  const login = async (password: string): Promise<boolean> => {
    setIsValidating(true)
    setValidationError(null)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password }),
      })

      if (!res.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await res.json()
      setAccessToken(data.accessToken)

      return true
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Login failed')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const completeOnboarding = async () => {
    if (selectedProvider) {
      const providerConfig: ProviderConfig = {
        id: selectedProvider,
        name: selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1),
        apiKey: apiKey,
        models: {
          transcription: transcriptionModel,
          fineTuning: finetuneModel
        },
        limits: {
          maxFileSize: 25 * 1024 * 1024,
          supportedFormats: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
        }
      }
      try {
        await saveProvider(providerConfig)
      } catch (e) {
        console.error("Failed to save provider config", e)
      }
    }

    const settings: AppSettings = {
      selectedProvider,
      selectedTranscriptionModel: transcriptionModel,
      selectedFinetuneModel: finetuneModel,
      customSystemPrompt,
      autoFineTune: false,
      encryptionDerived: true,
      theme: "system",
      onboardingComplete: true,
    }
    await saveSettings(settings)
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
        availableTranscriptionModels,
        setAvailableTranscriptionModels,
        availableFinetuneModels,
        setAvailableFinetuneModels,
        login,
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
