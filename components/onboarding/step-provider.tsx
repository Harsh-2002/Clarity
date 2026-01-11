"use client"

import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"
import { PROVIDER_CONFIGS } from "@/lib/providers"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, ArrowRight, ArrowLeft } from "lucide-react"
import Image from "next/image"

export function StepProvider() {
  const { setStep, selectedProvider, setSelectedProvider } = useOnboarding()
  const providers = Object.values(PROVIDER_CONFIGS)

  // Official Brand Icons (Brandfetch URLs)
  const ProviderIcons: Record<string, string> = {
    openai: "https://cdn.brandfetch.io/idR3duQxYl/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1749527480180",
    groq: "https://cdn.brandfetch.io/idxygbEPCQ/w/201/h/201/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1668515712972",
    assemblyai: "https://cdn.brandfetch.io/idXvvtuty0/w/300/h/300/theme/dark/icon.png?c=1bxid64Mup7aczewSAYMX&t=1669076365758"
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            Choose Intelligence
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest text-[10px]">
            Select your transcription engine
          </p>
        </div>

        <div className="space-y-4">
          {providers.map((provider) => (
            <motion.button
              key={provider.id}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--primary), 0.05)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProvider(provider.id as "openai" | "groq" | "assemblyai")}
              className={cn(
                "w-full p-5 rounded-3xl border text-left transition-all duration-300 flex items-center justify-between group",
                selectedProvider === provider.id
                  ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                  : "bg-card/50 border-transparent hover:border-primary/10 hover:bg-card/80 backdrop-blur-sm"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "relative h-12 w-12 flex items-center justify-center rounded-full overflow-hidden transition-all duration-300 shadow-sm",
                  selectedProvider === provider.id ? "ring-2 ring-primary/20" : "",
                  provider.id === 'openai' ? "bg-[#000000]" : "bg-white"
                )}>
                  {ProviderIcons[provider.id] ? (
                    <Image
                      src={ProviderIcons[provider.id]}
                      alt={provider.name}
                      width={48}
                      height={48}
                      className={cn(
                        "object-contain",
                        provider.id === 'groq' ? "w-full h-full scale-110" : "w-8 h-8"
                      )}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-lg tracking-tight">{provider.name}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                    {provider.id === 'groq' ? 'Lightning Fast' : provider.id === 'openai' ? 'Industry Standard' : 'Audio Specialist'}
                  </div>
                </div>
              </div>

              {selectedProvider === provider.id && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-5 h-5 text-primary" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            onClick={() => setStep(1)}
            variant="ghost"
            className="flex-1 rounded-full h-12 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={() => setStep(3)}
            disabled={!selectedProvider}
            className="flex-1 rounded-full h-12 shadow-md hover:shadow-lg transition-all"
          >
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
