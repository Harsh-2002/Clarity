"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOnboarding } from "./onboarding-context"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { StepProgress } from "./step-progress"

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
        <StepProgress />

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
            <Select value={transcriptionModel} onValueChange={setTranscriptionModel}>
              <SelectTrigger className="w-full h-14 rounded-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableTranscriptionModels.length > 0 ? (
                  availableTranscriptionModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No transcription models available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Refinement Model (Optional)</label>
            <Select value={finetuneModel || "skip"} onValueChange={(value) => setFinetuneModel(value === "skip" ? "" : value)}>
              <SelectTrigger className="w-full h-14 rounded-full">
                <SelectValue placeholder="Skip refinement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip refinement</SelectItem>
                {availableFinetuneModels.length > 0 ? (
                  availableFinetuneModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No fine-tuning models available</SelectItem>
                )}
              </SelectContent>
            </Select>
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

