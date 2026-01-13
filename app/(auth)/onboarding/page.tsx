"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/onboarding-context"
import { StepWelcome } from "@/components/onboarding/step-welcome"
import { StepProvider } from "@/components/onboarding/step-provider"
import { StepApiKey } from "@/components/onboarding/step-api-key"
import { StepModels } from "@/components/onboarding/step-models"
import { StepSystemPrompt } from "@/components/onboarding/step-system-prompt"
import { clearAccessToken } from "@/lib/storage"
import { handleDestination, resolveAppDestination } from "@/lib/client/auth-flow"

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
  const router = useRouter()

  useEffect(() => {
    let active = true
    const guard = async () => {
      const destination = await resolveAppDestination()
      if (!active) return

      if (destination.path === "/onboarding") {
        if (destination.clearToken) clearAccessToken()
        return
      }

      handleDestination(router, destination)
    }

    guard().catch(() => {
      if (!active) return
      clearAccessToken()
      router.replace("/login")
    })

    return () => {
      active = false
    }
  }, [router])

  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  )
}
