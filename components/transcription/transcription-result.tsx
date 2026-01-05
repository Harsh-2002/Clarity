"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, PenLine, Sparkles, Tag as TagIcon } from "lucide-react"
import type { Transcript } from "@/lib/types"
import { saveTranscript } from "@/lib/storage"
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
    <div className="space-y-8 w-full max-w-4xl mx-auto">
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
            <div className="flex gap-1">
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <PenLine className="w-4 h-4" />
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
          </div>

          {isEditing ? (
            <div className="flex-1 space-y-4">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-[300px] p-4 rounded-2xl border border-border bg-background resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <div className="flex gap-2 justify-end">
                <Button onClick={() => setIsEditing(false)} variant="ghost">Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 rounded-2xl bg-secondary/20 border border-border/50 text-lg leading-relaxed font-light text-foreground/90 whitespace-pre-wrap">
              {transcript.text}
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
            <div className="flex-1 p-6 rounded-2xl bg-primary/5 border border-primary/10 text-lg leading-relaxed font-normal text-foreground whitespace-pre-wrap shadow-sm">
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
