"use client"

import { Button } from "@/components/ui/button"
import type { Transcript } from "@/lib/types"
import { useRouter } from "next/navigation"

interface TranscriptCardProps {
  transcript: Transcript
  onDelete?: (id: string) => void
}

export function TranscriptCard({ transcript, onDelete }: TranscriptCardProps) {
  const router = useRouter()
  const date = new Date(transcript.createdAt).toLocaleDateString()

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">{date}</p>
          <p className="text-sm line-clamp-2 break-words">{transcript.text}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {transcript.provider} · {transcript.model}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/fine-tune?transcriptId=${transcript.id}`)} variant="outline" size="sm">
            Tune
          </Button>
          <Button onClick={() => onDelete?.(transcript.id)} variant="outline" size="sm" className="text-destructive">
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
