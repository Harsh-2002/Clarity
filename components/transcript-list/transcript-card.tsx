"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, CheckSquare, Square } from "lucide-react"
import type { Transcript } from "@/lib/types"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface TranscriptCardProps {
  transcript: Transcript
  onDelete?: (id: string) => void
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export function TranscriptCard({ transcript, onDelete, selectionMode, isSelected, onToggleSelect }: TranscriptCardProps) {
  const router = useRouter()
  const date = new Date(transcript.createdAt).toLocaleDateString()
  const [copiedRaw, setCopiedRaw] = useState(false)
  const [copiedFineTuned, setCopiedFineTuned] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const hasFinetuned = Boolean(transcript.fineTunedText)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const displayText = hasFinetuned ? transcript.fineTunedText : transcript.text
  const isLongText = displayText.length > 300

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = async (text: string, type: "raw" | "finetuned") => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      if (type === "raw") {
        setCopiedRaw(true)
        timeoutRef.current = setTimeout(() => setCopiedRaw(false), 2000)
      } else {
        setCopiedFineTuned(true)
        timeoutRef.current = setTimeout(() => setCopiedFineTuned(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  return (
    <div 
      className={cn(
        "group relative p-6 rounded-2xl hover:bg-secondary/50 transition-all duration-300 border",
        selectionMode && isSelected 
          ? "border-primary bg-primary/5" 
          : "bg-secondary/30 border-transparent hover:border-border/50"
      )}
      onClick={selectionMode ? onToggleSelect : undefined}
      role={selectionMode ? "button" : undefined}
    >
      {selectionMode && (
        <div className="absolute top-3 left-3 z-10">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}
      
      <div className={cn("space-y-4", selectionMode && "ml-8")}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{date}</p>
          {hasFinetuned && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Refined
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className={cn(
            "text-base leading-relaxed font-light text-foreground/90 whitespace-pre-wrap",
            !isExpanded && "line-clamp-3",
            isExpanded && "max-h-[60vh] overflow-y-auto"
          )}>
            {displayText}
          </div>
          
          {isLongText && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
          
          {/* Tags Display */}
          {transcript.tags && transcript.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {transcript.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary/90 border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-muted-foreground font-mono">
            {transcript.model}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleCopy(hasFinetuned ? transcript.fineTunedText! : transcript.text, hasFinetuned ? "finetuned" : "raw")
              }}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-background/50"
            >
              {copiedRaw || copiedFineTuned ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
            
            {!hasFinetuned && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/fine-tune?transcriptId=${transcript.id}`)
                }} 
                variant="ghost" 
                size="sm"
                className="h-8 px-3 text-xs hover:bg-background/50"
              >
                Refine
              </Button>
            )}
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(transcript.id)
              }} 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
