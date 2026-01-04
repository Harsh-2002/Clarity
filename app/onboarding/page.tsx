"use client"

import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-context"
import { StepWelcome } from "@/components/onboarding/step-welcome"
import { StepProvider } from "@/components/onboarding/step-provider"
import { StepApiKey } from "@/components/onboarding/step-api-key"
import { StepModels } from "@/components/onboarding/step-models"
import { StepSystemPrompt } from "@/components/onboarding/step-system-prompt"

function OnboardingContent() {
  const { step } = useOnboarding()

  return (
    <>
      {step === 1 && <StepWelcome />}
      {step === 2 && <StepProvider />}
      {step === 3 && <StepApiKey />}
      {step === 4 && <StepModels />}
      {step === 5 && <StepSystemPrompt />}
    </>
  )
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  )
}
