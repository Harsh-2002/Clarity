"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Transcript } from "@/lib/types"
import { saveTranscript } from "@/lib/storage"

interface TranscriptionResultProps {
  transcript: Transcript
  onEdit?: (updatedText: string) => void
  onFinetune?: () => void
  onBack?: () => void
}

export function TranscriptionResult({ transcript, onEdit, onFinetune, onBack }: TranscriptionResultProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(transcript.text)

  const handleSaveEdit = () => {
    const updated = { ...transcript, text: editedText }
    saveTranscript(updated)
    setIsEditing(false)
    onEdit?.(editedText)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Transcription</h3>
          <div className="text-xs text-muted-foreground">
            {transcript.provider} · {transcript.model}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground min-h-32 resize-none"
          />
        ) : (
          <div className="bg-secondary rounded-lg p-4 min-h-32 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {transcript.text}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="flex-1">
              Save
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
              Edit
            </Button>
            <Button onClick={onFinetune} className="flex-1">
              Fine-tune
            </Button>
          </>
        )}
      </div>

      {onBack && (
        <Button onClick={onBack} variant="ghost" className="w-full">
          ← Start over
        </Button>
      )}
    </div>
  )
}
