"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useOnboarding } from "./onboarding-context"
import { motion } from "framer-motion"
import { ArrowLeft, Check, Sparkles } from "lucide-react"
import { StepProgress } from "./step-progress"

export function StepSystemPrompt() {
  const { setStep, customSystemPrompt, setCustomSystemPrompt, completeOnboarding } = useOnboarding()
  const router = useRouter()

  const handleComplete = () => {
    completeOnboarding()
    router.push("/transcribe")
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
          <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            Final Polish
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">
            System Behavior Instructions (Optional)
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Ex: Focus on medical terminology, maintain speaker verbatim, format as a bulleted list..."
              className="w-full p-6 border-transparent rounded-3xl bg-muted/20 hover:bg-muted/30 focus:border-foreground/20 focus:ring-0 focus:bg-background transition-all min-h-[160px] resize-none text-center placeholder:text-muted-foreground/50 text-sm leading-relaxed"
            />
            <div className="absolute right-4 bottom-4 text-muted-foreground opacity-50">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground bg-secondary/30 rounded-2xl p-4">
            <p>You can leave this blank to use our optimized defaults. This can be changed later in Settings.</p>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => setStep(4)} variant="ghost" className="flex-1 rounded-full h-12 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={handleComplete} className="flex-1 rounded-full h-12 shadow-md hover:shadow-lg transition-all">
            Launch Workspace <Check className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
