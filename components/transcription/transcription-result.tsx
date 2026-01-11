"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, Pen, Sparkles, Tag as TagIcon, Download } from "lucide-react"
import type { Transcript } from "@/lib/types"
import { saveTranscript, getAccessToken } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { TagSelector } from "../transcript-list/tag-selector"

interface TranscriptionResultProps {
  transcript: Transcript
  onEdit?: (updatedText: string) => void
  onFinetune?: () => void
  onBack?: () => void
}

export function TranscriptionResult({ transcript, onEdit, onFinetune, onBack }: TranscriptionResultProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(transcript.text)
  const [copiedRaw, setCopiedRaw] = useState(false)
  const [copiedFineTuned, setCopiedFineTuned] = useState(false)
  const [tags, setTags] = useState<string[]>(transcript.tags || [])

  // Sync state when transcript prop changes
  useEffect(() => {
    setTags(transcript.tags || [])
    setEditedText(transcript.text)
  }, [transcript])

  // AI-suggested tags based on content keywords
  const suggestedTags = (() => {
    const text = (transcript.fineTunedText || transcript.text).toLowerCase()
    const suggestions: string[] = []

    if (/(meeting|call|discuss|agenda|zoom)/i.test(text)) suggestions.push("meeting")
    if (/(idea|concept|think|consider)/i.test(text)) suggestions.push("idea")
    if (/(todo|task|need to|should|must)/i.test(text)) suggestions.push("todo")
    if (/(reminder|remember|don't forget)/i.test(text)) suggestions.push("reminder")
    if (/(project|work|client)/i.test(text)) suggestions.push("project")

    return suggestions
  })()

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags)
    const updated = { ...transcript, tags: newTags }
    saveTranscript(updated)
  }

  const handleSaveEdit = () => {
    const updated = { ...transcript, text: editedText }
    saveTranscript(updated)
    setIsEditing(false)
    onEdit?.(editedText)
  }

  const handleCopy = async (text: string, type: "raw" | "finetuned") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "raw") {
        setCopiedRaw(true)
        const timer = setTimeout(() => setCopiedRaw(false), 2000)
        return () => clearTimeout(timer)
      } else {
        setCopiedFineTuned(true)
        const timer = setTimeout(() => setCopiedFineTuned(false), 2000)
        return () => clearTimeout(timer)
      }
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  const hasFinetuned = Boolean(transcript.fineTunedText)

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto px-4">
      {/* Audio Player */}
      {(transcript as any).recordingId && getAccessToken() && (
        <div className="w-full bg-secondary/30 rounded-3xl px-6 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Original Recording</span>
            {transcript.duration && (
              <span>{Math.floor(transcript.duration / 60).toString().padStart(2, '0')}:{(transcript.duration % 60).toString().padStart(2, '0')}</span>
            )}
          </div>
          <audio
            controls
            className="w-full h-10"
            preload="metadata"
          >
            <source
              src={`/api/v1/storage/files/${(transcript as any).recordingId}?token=${getAccessToken()}`}
              type="audio/webm"
            />
          </audio>
          <div className="flex justify-end">
            <a
              href={`/api/v1/storage/files/${(transcript as any).recordingId}?token=${getAccessToken()}`}
              download={`recording-${transcript.id}.webm`}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download Audio
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-secondary/50 px-3 py-1 rounded-full">
          {transcript.provider} · {transcript.model}
        </div>
        {onBack && (
          <Button
            onClick={onBack}
            variant="default"
            size="sm"
            className="shadow-sm"
          >
            Start New Session
          </Button>
        )}
      </div>

      {/* Tags */}
      <div className="border-t border-b border-border/40 py-4">
        <TagSelector tags={tags} onChange={handleTagsChange} suggestions={suggestedTags} />
      </div>

      <div className={cn("grid gap-8", hasFinetuned ? "lg:grid-cols-2" : "grid-cols-1")}>
        {/* Raw Transcription */}
        <div className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {hasFinetuned ? "Original" : "Transcription"}
            </h3>

            {transcript.status === 'failed' ? (
              <span className="text-destructive text-sm font-medium px-3 py-1 bg-destructive/10 rounded-full">
                Processing Failed
              </span>
            ) : (
              <div className="flex gap-1">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pen className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleCopy(transcript.text, "raw")}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  {copiedRaw ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex-1 space-y-4">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-[300px] p-4 rounded-3xl border border-border bg-background resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <div className="flex gap-2 justify-end">
                <Button onClick={() => setIsEditing(false)} variant="ghost">Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "flex-1 p-6 rounded-3xl border border-border/50 text-lg leading-relaxed font-light whitespace-pre-wrap max-h-[70vh] overflow-y-auto",
              transcript.status === 'failed' ? "bg-destructive/5 text-destructive border-destructive/20" : "bg-secondary/20 text-foreground/90"
            )}>
              {transcript.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
                  <p className="font-medium">Transcription failed to complete.</p>
                  <p className="text-sm opacity-80">You can still listen to the audio recording above.</p>
                </div>
              ) : (
                transcript.text
              )}
            </div>
          )}
        </div>

        {/* Fine-tuned Transcription */}
        {hasFinetuned && (
          <div className="space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <h3 className="font-medium text-sm text-primary uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Refined
              </h3>
              <Button
                onClick={() => handleCopy(transcript.fineTunedText!, "finetuned")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary/70 hover:text-primary hover:bg-primary/10"
                title="Copy"
              >
                {copiedFineTuned ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex-1 p-6 rounded-3xl bg-primary/5 border border-primary/10 text-lg leading-relaxed font-normal text-foreground whitespace-pre-wrap shadow-sm max-h-[70vh] overflow-y-auto">
              {transcript.fineTunedText}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!hasFinetuned && !isEditing && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={onFinetune}
            size="lg"
            className="px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Refine with AI
          </Button>
        </div>
      )}
    </div>
  )
}
