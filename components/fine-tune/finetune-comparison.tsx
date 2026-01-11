"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { FinetuneRequest } from "@/lib/types"

interface FinetuneComparisonProps {
  finetune: FinetuneRequest
  onAccept?: () => void
  onReject?: () => void
  onRetry?: () => void
}

export function FinetuneComparison({ finetune, onAccept, onReject, onRetry }: FinetuneComparisonProps) {
  const [showSideBySide, setShowSideBySide] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-border p-1">
          <button
            onClick={() => setShowSideBySide(false)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${!showSideBySide ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Stacked
          </button>
          <button
            onClick={() => setShowSideBySide(true)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${showSideBySide ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Split
          </button>
        </div>
      </div>

      {!showSideBySide && (
        <div className="space-y-8">
          <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Original</h3>
            <div className="text-base leading-relaxed font-light whitespace-pre-wrap">
              {finetune.originalText}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider">Refined</h3>
            <div className="text-lg leading-relaxed font-light whitespace-pre-wrap text-foreground">
              {finetune.finetumedText}
            </div>
          </div>
        </div>
      )}

      {showSideBySide && (
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-6 lg:gap-8">
          <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">Original</h3>
            <div className="text-base lg:text-base leading-relaxed font-light whitespace-pre-wrap max-h-[70vh] overflow-y-auto pr-2 p-4 rounded-3xl bg-secondary/20 border border-border/50">
              {finetune.originalText}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">Refined</h3>
            <div className="text-base lg:text-lg leading-relaxed font-light whitespace-pre-wrap max-h-[70vh] overflow-y-auto pr-2 p-4 rounded-3xl bg-primary/5 border border-primary/10">
              {finetune.finetumedText}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4 border-t border-border/40">
        <Button onClick={onReject} variant="ghost" className="flex-1 text-muted-foreground hover:text-destructive">
          Discard
        </Button>
        <Button onClick={onRetry} variant="ghost" className="flex-1">
          Try Again
        </Button>
        <Button onClick={onAccept} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  )
}
