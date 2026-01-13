"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Cpu, ChevronDown } from "lucide-react"

export function StepModels() {
  const {
    setStep,
    transcriptionModel,
    setTranscriptionModel,
    finetuneModel,
    setFinetuneModel,
    availableTranscriptionModels,
    availableFinetuneModels,
  } = useOnboarding()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            Model Configuration
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">
            Define Intelligence Parameters
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Transcription Engine</label>
            <div className="relative">
              <select
                value={transcriptionModel}
                onChange={(e) => setTranscriptionModel(e.target.value)}
                className="w-full h-14 px-10 border border-border/60 dark:border-input rounded-full bg-background dark:bg-input/30 hover:bg-muted/20 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-none transition-all text-center text-sm font-medium cursor-pointer [&::-ms-expand]:hidden appearance-none"
                style={{ backgroundImage: 'none' }}
              >
                <option value="" disabled>Select a model</option>
                {availableTranscriptionModels.length > 0 ? (
                  availableTranscriptionModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                ) : (
                  <option disabled>No transcription models available</option>
                )}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Refinement Model (Optional)</label>
            <div className="relative">
              <select
                value={finetuneModel}
                onChange={(e) => setFinetuneModel(e.target.value)}
                className="w-full h-14 px-10 border border-border/60 dark:border-input rounded-full bg-background dark:bg-input/30 hover:bg-muted/20 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus:outline-none transition-all text-center text-sm font-medium cursor-pointer [&::-ms-expand]:hidden appearance-none"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">Skip refinement</option>
                {availableFinetuneModels.length > 0 ? (
                  availableFinetuneModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                ) : (
                  <option disabled>No fine-tuning models available</option>
                )}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => setStep(3)} variant="ghost" className="flex-1 rounded-full h-12 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={() => setStep(5)} disabled={!transcriptionModel} className="flex-1 rounded-full h-12 shadow-md hover:shadow-lg transition-all">
            Confirm Configuration <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

