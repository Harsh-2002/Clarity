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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={() => setShowSideBySide(false)}
          variant={!showSideBySide ? "default" : "outline"}
          className="flex-1"
        >
          Stacked
        </Button>
        <Button
          onClick={() => setShowSideBySide(true)}
          variant={showSideBySide ? "default" : "outline"}
          className="flex-1"
        >
          Side by Side
        </Button>
      </div>

      {!showSideBySide && (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Original</h3>
            <div className="bg-secondary rounded-lg p-4 min-h-24 text-sm whitespace-pre-wrap break-words leading-relaxed">
              {finetune.originalText}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Improved</h3>
            <div className="bg-secondary rounded-lg p-4 min-h-24 text-sm whitespace-pre-wrap break-words leading-relaxed border-2 border-primary">
              {finetune.finetumedText}
            </div>
          </div>
        </div>
      )}

      {showSideBySide && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Original</h3>
            <div className="bg-secondary rounded-lg p-3 min-h-40 text-xs whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto">
              {finetune.originalText}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Improved</h3>
            <div className="bg-secondary rounded-lg p-3 min-h-40 text-xs whitespace-pre-wrap break-words leading-relaxed border-2 border-primary max-h-96 overflow-y-auto">
              {finetune.finetumedText}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onReject} variant="outline" className="flex-1 bg-transparent">
          Reject
        </Button>
        <Button onClick={onRetry} variant="outline" className="flex-1 bg-transparent">
          Retry
        </Button>
        <Button onClick={onAccept} className="flex-1">
          Accept
        </Button>
      </div>
    </div>
  )
}
