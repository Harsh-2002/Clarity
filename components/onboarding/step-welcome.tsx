"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"
import { ArrowRight } from "lucide-react"
import { StepProgress } from "./step-progress"

export function StepWelcome() {
  const { setStep } = useOnboarding()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <StepProgress />

        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">Clarity</h1>
          <p className="text-muted-foreground text-lg">
            Your personal AI audio workspace
          </p>
        </div>

        <div className="bg-card/50 rounded-3xl p-8 space-y-6 border border-border/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all">
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <h2 className="font-semibold text-xl">Let&apos;s Get Started</h2>
              <p className="text-sm text-muted-foreground">We need to select your AI provider and configure the system.</p>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-sm text-primary/80 text-center space-y-1">
              <p>✔ System Secured</p>
              <p>✔ Database Initialized</p>
              <p>✔ Admin Account Created</p>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full h-12 text-lg rounded-full"
            size="lg"
          >
            Configure AI <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
