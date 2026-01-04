"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useOnboarding } from "./onboarding-context"

export function StepSystemPrompt() {
  const { setStep, customSystemPrompt, setCustomSystemPrompt, completeOnboarding } = useOnboarding()
  const router = useRouter()

  const handleComplete = () => {
    completeOnboarding()
    router.push("/transcribe")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Fine-tuning Instructions (Optional)</h2>
          <p className="text-muted-foreground">Customize how your transcriptions are fine-tuned</p>
        </div>

        <textarea
          value={customSystemPrompt}
          onChange={(e) => setCustomSystemPrompt(e.target.value)}
          placeholder="E.g., Focus on technical terminology, maintain original punctuation, etc."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground min-h-32 resize-none"
        />

        <div className="text-xs text-muted-foreground bg-secondary rounded p-3">
          <p>Leave blank to use default fine-tuning. You can update this anytime in settings.</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setStep(4)} variant="outline" className="flex-1">
            Back
          </Button>
          <Button onClick={handleComplete} className="flex-1">
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
