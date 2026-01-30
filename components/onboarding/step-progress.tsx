"use client"

import { useOnboarding } from "./onboarding-context"

export function StepProgress() {
  const { step } = useOnboarding()
  const totalSteps = 5

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Step {step} of {totalSteps}</span>
        <span className="text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
      </div>
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Onboarding progress: step ${step} of ${totalSteps}`}
        />
      </div>
    </div>
  )
}
